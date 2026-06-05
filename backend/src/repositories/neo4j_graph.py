import os
from neo4j import AsyncGraphDatabase
from typing import List, Dict, Any
from logging import getLogger

logger = getLogger(__name__)

class Neo4jRepository:
    def __init__(self):
        # We assume Neo4j is running at bolt://neo4j:7687 or localhost for dev
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))

    async def close(self):
        await self.driver.close()

    async def create_entities_and_relations(self, project_id: str, document_id: str, entities: List[Dict[str, Any]], relations: List[Dict[str, Any]]):
        async with self.driver.session() as session:
            # Create Entities
            for entity in entities:
                query = """
                MERGE (e:Entity {name: $name, project_id: $project_id})
                SET e.type = $type, e.description = $description, e.document_id = $document_id
                """
                await session.run(query, 
                    name=entity.get("name", "").lower(), 
                    type=entity.get("type", "UNKNOWN"), 
                    description=entity.get("description", ""),
                    project_id=str(project_id),
                    document_id=str(document_id)
                )

            # Create Relations
            for rel in relations:
                query = """
                MATCH (source:Entity {name: $source_name, project_id: $project_id})
                MATCH (target:Entity {name: $target_name, project_id: $project_id})
                MERGE (source)-[r:RELATED {type: $relation_type}]->(target)
                SET r.description = $description, r.document_id = $document_id
                """
                await session.run(query,
                    source_name=rel.get("source", "").lower(),
                    target_name=rel.get("target", "").lower(),
                    relation_type=rel.get("type", "RELATES_TO").upper().replace(" ", "_"),
                    description=rel.get("description", ""),
                    project_id=str(project_id),
                    document_id=str(document_id)
                )

    async def traverse_neighborhood(self, project_id: str, entity_names: List[str], depth: int = 1) -> str:
        if not entity_names:
            return ""

        async with self.driver.session() as session:
            # Optimized Cypher query: filters out highly connected hub nodes (degree >= 30)
            # to avoid path size explosion during multi-hop traversal.
            query = f"""
            MATCH (n:Entity)
            WHERE n.project_id = $project_id AND n.name IN $entity_names
            WITH n WHERE size((n)-[:RELATED]-()) < 30
            MATCH p=(n)-[*1..{depth}]-(m:Entity)
            WHERE all(node IN nodes(p) WHERE size((node)-[:RELATED]-()) < 50)
            RETURN n.name AS source, type(rels(p)[0]) AS relation, m.name AS target
            LIMIT 30
            """
            result = await session.run(query, project_id=str(project_id), entity_names=[name.lower() for name in entity_names])
            records = await result.data()

            context_lines = []
            for record in records:
                context_lines.append(f"{record['source']} -[{record['relation']}]-> {record['target']}")

            return "\n".join(set(context_lines))
