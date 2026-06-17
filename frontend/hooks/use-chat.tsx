"use client"

import * as React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useProjects } from "@/hooks/use-projects"
import { useDocuments } from "@/hooks/use-documents"
import { streamChat } from "@/lib/chat-stream"
import {
  type ChatRequest,
  type Conversation,
  type FeedbackRequest,
  type Message,
  type PaginatedResponse,
  type Source,
} from "@/lib/api"
import { toast } from "@/components/ui/toast"

type FeedbackRating = FeedbackRequest["rating"]

const PAGE_SIZE = 10

interface ChatContextValue {
  conversations: Conversation[]
  conversationsTotal: number
  activeConversationId: string | null
  messages: Message[]
  sources: Source[]
  feedbackByMessageId: Record<string, FeedbackRating>
  pendingFeedbackId: string | null
  isLoadingMessages: boolean
  isStreaming: boolean
  executingNode: string | null
  isLoadingMoreConversations: boolean
  openConversation: (conversationId: string) => Promise<void>
  prepareNewChat: (config: { projectId: string; documentIds: string[] }) => Promise<void>
  submitMessage: (question: string) => Promise<boolean>
  sendFeedback: (messageId: string, rating: FeedbackRating) => Promise<void>
  loadMoreConversations: () => Promise<void>
}

const ChatContext = React.createContext<ChatContextValue | null>(null)

function getStoredFeedback(message: Message): FeedbackRating | null {
  const feedback = message.metadata_?.feedback
  if (
    typeof feedback === "object" &&
    feedback !== null &&
    "rating" in feedback &&
    ((feedback as { rating: unknown }).rating === "up" ||
      (feedback as { rating: unknown }).rating === "down")
  ) {
    return (feedback as { rating: FeedbackRating }).rating
  }
  return null
}

export function ChatProvider({ children }: React.PropsWithChildren) {
  const { token, authedFetch } = useAuth()
  const { activeProjectId, selectProject } = useProjects()
  const { scopedDocumentIds, hasScopedDocuments } = useDocuments()

  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [conversationsTotal, setConversationsTotal] = React.useState(0)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [sources, setSources] = React.useState<Source[]>([])
  const [feedbackByMessageId, setFeedbackByMessageId] = React.useState<
    Record<string, FeedbackRating>
  >({})
  const [pendingFeedbackId, setPendingFeedbackId] = React.useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [executingNode, setExecutingNode] = React.useState<string | null>(null)
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = React.useState(false)

  const loadConversations = React.useCallback(
    async (projectId: string, skip = 0) => {
      const response = await authedFetch<PaginatedResponse<Conversation>>(
        `/api/projects/${projectId}/conversations?skip=${skip}&limit=${PAGE_SIZE}`
      )
      if (skip === 0) {
        setConversations(response.items)
      } else {
        setConversations((current) => [...current, ...response.items])
      }
      setConversationsTotal(response.total)
      return response
    },
    [authedFetch]
  )

  React.useEffect(() => {
    if (!activeProjectId) {
      setConversations([])
      setConversationsTotal(0)
      setActiveConversationId(null)
      setMessages([])
      setSources([])
      setFeedbackByMessageId({})
      return
    }
    void loadConversations(activeProjectId)
  }, [activeProjectId, loadConversations])

  const openConversation = React.useCallback(
    async (conversationId: string) => {
      if (!activeProjectId) return

      setIsLoadingMessages(true)
      setActiveConversationId(conversationId)
      setMessages([])
      setSources([])

      try {
        const conversation = await authedFetch<{ messages: Message[] }>(
          `/api/projects/${activeProjectId}/conversations/${conversationId}`
        )
        setMessages(conversation.messages)
        setFeedbackByMessageId(
          Object.fromEntries(
            conversation.messages
              .map((m) => [m.id, getStoredFeedback(m)] as const)
              .filter((entry): entry is [string, FeedbackRating] =>
                Boolean(entry[0] && entry[1])
              )
          )
        )
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not load conversation")
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [activeProjectId, authedFetch]
  )

  const prepareNewChat = React.useCallback(
    async (config: { projectId: string; documentIds: string[] }) => {
      await selectProject(config.projectId)
      setActiveConversationId(null)
      setMessages([])
      setSources([])
      setFeedbackByMessageId({})
    },
    [selectProject]
  )

  const submitMessage = React.useCallback(
    async (question: string) => {
      if (!question.trim() || !activeProjectId || isStreaming || !token) return false

      const userQuestion = question.trim()
      setIsStreaming(true)
      setExecutingNode(null)
      setSources([])
      setMessages((current) => [
        ...current,
        { role: "user", content: userQuestion } as Message,
        { role: "assistant", content: "" } as Message,
      ])

      try {
        const request: ChatRequest = {
          conversation_id: activeConversationId,
          message: userQuestion,
          document_ids: scopedDocumentIds,
        }

        await streamChat({
          projectId: activeProjectId,
          token,
          request,
          onConversation: (conversation) => {
            setActiveConversationId(conversation.id)
          },
          onSources: (newSources) => {
            setSources(newSources)
          },
          onToken: (tokenChunk) => {
            setMessages((current) => {
              const next = [...current]
              const last = next[next.length - 1]
              next[next.length - 1] = {
                ...last,
                content: `${last.content}${tokenChunk}`,
              }
              return next
            })
          },
          onNode: (nodeName) => {
            setExecutingNode(nodeName)
          },
          onFinal: (payload) => {
            setMessages((current) => {
              const next = [...current]
              const last = next[next.length - 1]
              next[next.length - 1] = {
                ...last,
                id: payload.message_id,
                content: payload.content,
              }
              return next
            })
          },
        })

        await loadConversations(activeProjectId)
        return true
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Chat failed")
        setMessages((current) => current.slice(0, Math.max(0, current.length - 1)))
        return false
      } finally {
        setIsStreaming(false)
        setExecutingNode(null)
      }
    },
    [
      activeConversationId,
      activeProjectId,
      hasScopedDocuments,
      isStreaming,
      loadConversations,
      scopedDocumentIds,
      token,
    ]
  )

  const sendFeedback = React.useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      if (!activeProjectId) return

      setPendingFeedbackId(messageId)
      try {
        await authedFetch<{ status: string }>(
          `/api/projects/${activeProjectId}/chat/messages/${messageId}/feedback`,
          {
            method: "POST",
            body: JSON.stringify({ rating } satisfies FeedbackRequest),
          }
        )
        setFeedbackByMessageId((current) => ({ ...current, [messageId]: rating }))
        setMessages((current) =>
          current.map((m) => {
            if (m.id !== messageId) return m
            return {
              ...m,
              metadata_: { ...m.metadata_, feedback: { rating, comment: null } },
            }
          })
        )
        toast.success("Feedback saved")
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not save feedback")
      } finally {
        setPendingFeedbackId(null)
      }
    },
    [activeProjectId, authedFetch]
  )

  const loadMoreConversations = React.useCallback(async () => {
    if (!activeProjectId || conversations.length >= conversationsTotal) return

    setIsLoadingMoreConversations(true)
    try {
      await loadConversations(activeProjectId, conversations.length)
    } catch {
      toast.error("Failed to load more conversations")
    } finally {
      setIsLoadingMoreConversations(false)
    }
  }, [activeProjectId, conversations.length, conversationsTotal, loadConversations])

  const value = React.useMemo<ChatContextValue>(
    () => ({
      conversations,
      conversationsTotal,
      activeConversationId,
      messages,
      sources,
      feedbackByMessageId,
      pendingFeedbackId,
      isLoadingMessages,
      isStreaming,
      executingNode,
      isLoadingMoreConversations,
      openConversation,
      prepareNewChat,
      submitMessage,
      sendFeedback,
      loadMoreConversations,
    }),
    [
      conversations,
      conversationsTotal,
      activeConversationId,
      messages,
      sources,
      feedbackByMessageId,
      pendingFeedbackId,
      isLoadingMessages,
      isStreaming,
      executingNode,
      isLoadingMoreConversations,
      openConversation,
      prepareNewChat,
      submitMessage,
      sendFeedback,
      loadMoreConversations,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const value = React.useContext(ChatContext)
  if (!value) throw new Error("useChat must be used inside ChatProvider")
  return value
}
