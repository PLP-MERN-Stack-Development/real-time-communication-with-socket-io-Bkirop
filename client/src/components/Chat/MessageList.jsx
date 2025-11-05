import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '../../contexts/SocketContext';

const MessageList = ({ messages, currentUserId }) => {
  const { socket } = useSocket();
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleReaction = (messageId, emoji) => {
    socket.emit('reaction:add', {
      messageId,
      userId: currentUserId,
      emoji
    });
  };

  const renderMessageContent = (message) => {
    if (message.type === 'file') {
      const isImage = message.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      
      if (isImage) {
        return (
          <img 
            src={message.fileUrl} 
            alt={message.fileName || 'Shared image'}
            className="max-w-sm rounded-lg shadow-lg"
            loading="lazy"
          />
        );
      }
      
      return (
        <a 
          href={message.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-sm">{message.fileName || 'Download file'}</span>
        </a>
      );
    }
    
    return <p>{message.content}</p>;
  };

  return (
    <div ref={listRef} className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {messages.map((message) => {
        const isOwn = message.sender._id === currentUserId;
        const messageClasses = `flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`;
        
        return (
          <div key={message._id || message.tempId} className={messageClasses}>
            <img
              src={message.sender.avatar || `https://ui-avatars.com/api/?name=${message.sender.username}`}
              alt={message.sender.username}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            
            <div className={`flex flex-col ${isOwn ? 'items-end' : ''}`}>
              {!isOwn && (
                <div className="text-xs text-gray-400 mb-1">
                  {message.sender.username}
                </div>
              )}
              
              <div className={`
                relative max-w-md rounded-lg p-3 
                ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}
                ${message.pending ? 'opacity-70' : ''}
              `}>
                {renderMessageContent(message)}
                <div className="text-xs text-gray-300 mt-1 flex items-center gap-2">
                  {formatDistanceToNow(new Date(message.createdAt), {
                    addSuffix: true
                  })}
                  {message.edited && (
                    <span className="italic">(edited)</span>
                  )}
                  {message.pending && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Sending...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className={`
                  flex flex-wrap gap-1 mt-1
                  ${isOwn ? 'justify-end' : 'justify-start'}
                `}>
                  {message.reactions.map((reaction, idx) => (
                    <div
                      key={idx}
                      className="flex items-center bg-gray-800 rounded-full px-2 py-1 text-sm"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="ml-1 text-xs text-gray-400">{reaction.count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick reactions */}
              <div className={`
                absolute -bottom-8 ${isOwn ? 'right-0' : 'left-0'}
                flex items-center gap-1 p-1 bg-gray-800 rounded-full shadow-lg
                opacity-0 group-hover:opacity-100 transition-opacity
              `}>
                {['❤️', '👍', '😂', '😮', '👏', '🎉'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message._id || message.tempId, emoji)}
                    className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;
