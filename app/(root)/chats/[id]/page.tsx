import ChatSection from "./chat-section"

const ChatDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return (
        <div className="flex-1">
            <ChatSection chatId={id} />
        </div>
    )
}

export default ChatDetailPage