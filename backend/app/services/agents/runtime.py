import logging
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.agents.event_bus import event_bus as default_event_bus
from app.services.agents.interfaces import AgentRouter, EventBus
from app.services.agents.interfaces import AgentRuntime as AgentRuntimeABC
from app.services.agents.router import RegistryRouter
from app.services.agents.tool_executor import ToolExecutor
from app.services.agents.tool_executor import tool_executor as default_tool_executor
from app.services.langfuse_client import get_langfuse
from app.services.llm_client import BaseLLMClient
from app.utils.langfuse_utils import safe_trace_update

logger = logging.getLogger(__name__)


class AgentRuntime(AgentRuntimeABC):
    def __init__(
        self,
        db: AsyncSession,
        llm_client: BaseLLMClient,
        router: AgentRouter | None = None,
        event_bus: EventBus | None = None,
        tool_executor: ToolExecutor | None = None,
    ):
        self.db = db
        self.llm_client = llm_client
        self.router = router or RegistryRouter(db)
        self.event_bus = event_bus or default_event_bus
        self.tool_executor = tool_executor or default_tool_executor
        self.lf = get_langfuse()

    async def _run_rag_fallback(
        self,
        *,
        user_input: str,
        conversation_id: UUID,
        project_id: UUID | None,
        workspace_id: UUID,
        **kwargs: Any,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Run the built-in RAG graph when no agent or no dynamic workflow exists."""
        from app.services.agents.rag import prepare_rag_context

        rag_project_id = project_id or workspace_id
        async for chunk in prepare_rag_context(
            db=self.db,
            project_id=rag_project_id,
            conversation_id=conversation_id,
            question=user_input,
            llm_client=self.llm_client,
            **kwargs,
        ):
            node_name = list(chunk.keys())[0] if isinstance(chunk, dict) else "unknown"
            await self.event_bus.publish("StepCompleted", node_name=node_name, chunk=chunk)
            yield chunk

    async def execute(
        self,
        user_input: str,
        conversation_id: UUID,
        workspace_id: UUID,
        project_id: UUID | None = None,
        trace_id: str | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Main entry point for agent orchestration.

        Args:
            user_input: The user's message text.
            conversation_id: Current conversation UUID.
            workspace_id: The workspace to route agents from.
            project_id: Project UUID for RAG fallback (passed separately from workspace_id).
            trace_id: Optional Langfuse trace ID for continuation.
        """
        await self.event_bus.publish(
            "AgentStarted", conversation_id=conversation_id, user_input=user_input
        )

        # 1. Semantic Routing
        agent = await self.router.select_agent(user_input, workspace_id)

        # If no agent configured, fall back to a direct conversational response
        if not agent:
            yield {"conversational_fallback": {"prompt": user_input}}
            await self.event_bus.publish("AgentFinished", conversation_id=conversation_id)
            return

        logger.info("Routed to Agent: %s", agent.name)

        # 2. Setup Langfuse Tracing
        trace = None
        if self.lf:
            try:
                trace = self.lf.trace(
                    id=str(trace_id) if trace_id else None,
                    name=f"agent-run-{agent.name}",
                    session_id=str(conversation_id),
                    input=user_input,
                    tags=["os-platform", agent.name],
                    metadata={"agent_id": str(agent.id), "workspace_id": str(workspace_id)},
                )
            except Exception as e:
                logger.warning("Failed to create langfuse trace: %s", e)

        # 3. Execute Tools (if workflow defines tool calls)
        tools = (agent.workflow_definition or {}).get("tools", [])
        tool_results: list[dict[str, Any]] = []
        for tool_call in tools:
            tool_name = tool_call.get("name", "")
            tool_params = tool_call.get("parameters", {})
            try:
                result = await self.tool_executor.execute(tool_name, tool_params)
                tool_results.append({"tool": tool_name, "result": result})
                await self.event_bus.publish(
                    "ToolExecuted", tool_name=tool_name, result=result
                )
            except ValueError as e:
                logger.warning("Tool %s not available: %s", tool_name, e)
        if tool_results:
            logger.info("Executed %d tool(s) for agent %s", len(tool_results), agent.name)

        # 4. Build & Execute Graph
        try:
            workflow_def = agent.workflow_definition or {}
            if workflow_def.get("nodes"):
                from app.services.agents.builder import build_dynamic_graph

                graph = build_dynamic_graph(workflow_def)
                initial_state = {
                    "user_input": user_input,
                    "conversation_id": str(conversation_id),
                    "workspace_id": str(workspace_id),
                }

                async for output in graph.astream(initial_state, stream_mode="updates"):
                    node_name = list(output.keys())[0] if isinstance(output, dict) else "unknown"
                    await self.event_bus.publish("StepCompleted", node_name=node_name, chunk=output)
                    yield output
            else:
                async for chunk in self._run_rag_fallback(
                    user_input=user_input,
                    conversation_id=conversation_id,
                    project_id=project_id,
                    workspace_id=workspace_id,
                    **kwargs,
                ):
                    yield chunk

            if trace:
                safe_trace_update(trace, self.lf, output="Agent completed successfully")

            await self.event_bus.publish("AgentFinished", conversation_id=conversation_id)

        except Exception as e:
            logger.error("Agent execution failed: %s", e)
            if trace:
                safe_trace_update(trace, self.lf, output=f"Error: {e}", metadata={"error": True})
            await self.event_bus.publish(
                "AgentFailed", conversation_id=conversation_id, reason=str(e)
            )
            raise
        finally:
            if trace:
                safe_trace_update(trace, self.lf)
