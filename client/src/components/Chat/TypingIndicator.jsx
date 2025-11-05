const TypingIndicator = ({ users }) => {
  const text = users.length === 1
    ? `${users[0]} is typing`
    : `${users.join(', ')} are typing`;

  return (
    <div className="typing-indicator">
      <div className="dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
      <div className="typing-text">
        {text}
      </div>
    </div>
  );
};

export default TypingIndicator;