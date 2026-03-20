import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getForumMessages,
  getThreadReplies,
  postForumMessage,
  deleteForumMessage,
  togglePinMessage,
  toggleMessageReaction,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/apiService';
import { toast } from 'react-toastify';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👎'];

const DiscussionForum = ({ eventId }) => {
  const { isAuthenticated, role, user } = useAuth();

  // Forum State
  const [forumMessages, setForumMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [forumPage, setForumPage] = useState(1);
  const [forumPagination, setForumPagination] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [postingMessage, setPostingMessage] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [forumLoading, setForumLoading] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [isEventOrganizer, setIsEventOrganizer] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchForumMessages();

    // Auto-refresh every 10 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchForumMessagesSilent();
      if (isAuthenticated) fetchNotificationsSilent();
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [eventId]);

  useEffect(() => {
    if (isAuthenticated && (role === 'participant' || role === 'organizer')) {
      fetchNotificationsSilent();
    }
  }, [isAuthenticated, role]);

  const fetchForumMessages = async (page = 1) => {
    setForumLoading(true);
    try {
      const response = await getForumMessages(eventId, page);
      setForumMessages(response.data.messages);
      setAnnouncements(response.data.announcements);
      setForumPagination(response.data.pagination);
      setForumPage(page);
      setCanPost(response.data.canPost || false);
      setIsEventOrganizer(response.data.isEventOrganizer || false);
    } catch (error) {
      console.error('Failed to load forum messages');
    } finally {
      setForumLoading(false);
    }
  };

  const fetchForumMessagesSilent = async () => {
    try {
      const response = await getForumMessages(eventId, forumPage);
      setForumMessages(response.data.messages);
      setAnnouncements(response.data.announcements);
      setForumPagination(response.data.pagination);
      setCanPost(response.data.canPost || false);
      setIsEventOrganizer(response.data.isEventOrganizer || false);
    } catch (error) {
      // Silent fail
    }
  };

  const fetchNotificationsSilent = async () => {
    try {
      const response = await getNotifications('true', eventId);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      // Silent fail
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      fetchNotificationsSilent();
    } catch (error) {
      // Silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(eventId);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    setPostingMessage(true);
    try {
      await postForumMessage(eventId, {
        content: newMessage,
        isAnnouncement,
      });
      setNewMessage('');
      setIsAnnouncement(false);
      fetchForumMessages(forumPage);
      toast.success('Message posted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post message');
    } finally {
      setPostingMessage(false);
    }
  };

  const handlePostReply = async () => {
    if (!replyContent.trim() || !activeThread) return;
    setPostingMessage(true);
    try {
      await postForumMessage(eventId, {
        content: replyContent,
        parentMessage: activeThread._id,
      });
      setReplyContent('');
      const res = await getThreadReplies(eventId, activeThread._id);
      setActiveThread(res.data.parentMessage);
      setThreadReplies(res.data.replies);
      fetchForumMessages(forumPage);
      toast.success('Reply posted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post reply');
    } finally {
      setPostingMessage(false);
    }
  };

  const handleOpenThread = async (message) => {
    try {
      const res = await getThreadReplies(eventId, message._id);
      setActiveThread(res.data.parentMessage);
      setThreadReplies(res.data.replies);
    } catch (error) {
      toast.error('Failed to load thread');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteForumMessage(eventId, messageId);
      toast.success('Message deleted');
      if (activeThread && activeThread._id === messageId) {
        setActiveThread(null);
        setThreadReplies([]);
      } else if (activeThread) {
        const res = await getThreadReplies(eventId, activeThread._id);
        setActiveThread(res.data.parentMessage);
        setThreadReplies(res.data.replies);
      }
      fetchForumMessages(forumPage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleTogglePin = async (messageId) => {
    try {
      await togglePinMessage(eventId, messageId);
      fetchForumMessages(forumPage);
      toast.success('Pin toggled');
    } catch (error) {
      toast.error('Failed to toggle pin');
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await toggleMessageReaction(eventId, messageId, { emoji });
      if (activeThread) {
        const res = await getThreadReplies(eventId, activeThread._id);
        setActiveThread(res.data.parentMessage);
        setThreadReplies(res.data.replies);
      }
      fetchForumMessages(forumPage);
    } catch (error) {
      toast.error('Failed to update reaction');
    }
  };

  const renderReactions = (message) => {
    const grouped = {};
    (message.reactions || []).forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r);
    });

    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
        {Object.entries(grouped).map(([emoji, reactions]) => {
          const hasReacted = user && reactions.some((r) => r.user === user._id);
          return (
            <button
              key={emoji}
              onClick={() => canPost && handleReaction(message._id, emoji)}
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                border: hasReacted ? '2px solid #333' : '1px solid #ddd',
                background: hasReacted ? '#eee' : '#f8f9fa',
                cursor: canPost ? 'pointer' : 'default',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {emoji} <span style={{ fontSize: '12px' }}>{reactions.length}</span>
            </button>
          );
        })}
        {canPost && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px dashed #ccc',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              onClick={(e) => {
                const popup = e.currentTarget.nextSibling;
                popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
              }}
            >
              +
            </button>
            <div
              style={{
                display: 'none',
                position: 'absolute',
                bottom: '100%',
                left: 0,
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '4px',
                gap: '4px',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {REACTION_EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => handleReaction(message._id, em)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMessageCard = (msg, isReply = false) => {
    const canDelete =
      isAuthenticated &&
      (isEventOrganizer || (user && msg.author === user._id));
    const canPinMsg = isEventOrganizer && !isReply && !msg.parentMessage;

    return (
      <div
        key={msg._id}
        style={{
          padding: '12px 16px',
          borderLeft: msg.isAnnouncement
            ? '4px solid #555'
            : msg.isPinned
            ? '4px solid #333'
            : '3px solid transparent',
          backgroundColor: msg.isAnnouncement ? '#f5f5f5' : msg.isPinned ? '#eee' : '#fff',
          borderRadius: '8px',
          marginBottom: '10px',
          border: msg.isAnnouncement
            ? '1px solid #555'
            : msg.isPinned
            ? '1px solid #ccc'
            : '1px solid #eee',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{msg.authorName}</span>
            {msg.authorModel === 'Organizer' && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#333',
                  color: 'white',
                }}
              >
                Organizer
              </span>
            )}
            {msg.isAnnouncement && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#555',
                  color: 'white',
                }}
              >
                📢 Announcement
              </span>
            )}
            {msg.isPinned && !msg.isAnnouncement && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#333',
                  color: 'white',
                }}
              >
                📌 Pinned
              </span>
            )}
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
              {new Date(msg.createdAt).toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {canPinMsg && (
              <button
                onClick={() => handleTogglePin(msg._id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                title={msg.isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDeleteMessage(msg._id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666',
                }}
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <p style={{ margin: '8px 0 4px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.content}</p>

        {renderReactions(msg)}

        {!isReply && !msg.parentMessage && (
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => handleOpenThread(msg)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#333',
                cursor: 'pointer',
                fontSize: '13px',
                padding: 0,
              }}
            >
              💬 {msg.replyCount > 0 ? `${msg.replyCount} replies` : 'Reply'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '24px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #333',
          paddingBottom: '10px',
        }}
      >
        <h2 style={{ margin: 0 }}>💬 Discussion Forum</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#999' }}>⟳ Live updates</span>

          {/* Notification Bell */}
          {isAuthenticated && (role === 'participant' || role === 'organizer') && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotificationsSilent();
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '22px',
                  position: 'relative',
                  padding: '4px',
                }}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-4px',
                      backgroundColor: '#666',
                      color: 'white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '340px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <strong style={{ fontSize: '14px' }}>Notifications</strong>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#333',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          if (!notif.isRead) handleMarkNotificationRead(notif._id);
                          setShowNotifications(false);
                        }}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid #f5f5f5',
                          backgroundColor: notif.isRead ? 'white' : '#f0f0f0',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: notif.isRead ? 'normal' : 'bold',
                            fontSize: '13px',
                            marginBottom: '2px',
                          }}
                        >
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>
                          {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#555', marginBottom: '10px' }}>📢 Announcements</h4>
          {announcements.map((ann) => renderMessageCard(ann))}
        </div>
      )}

      {/* Post New Message */}
      {canPost ? (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #eee',
          }}
        >
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isEventOrganizer
                ? 'Post a message or announcement...'
                : 'Ask a question or share your thoughts...'
            }
            rows="3"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
            }}
          >
            <div>
              {isEventOrganizer && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAnnouncement}
                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                  />
                  📢 Post as Announcement
                </label>
              )}
            </div>
            <button
              onClick={handlePostMessage}
              disabled={postingMessage || !newMessage.trim()}
              className="btn btn-primary"
              style={{ padding: '8px 20px' }}
            >
              {postingMessage ? 'Posting...' : 'Post Message'}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666',
            border: '1px solid #eee',
          }}
        >
          {!isAuthenticated ? (
            <p style={{ margin: 0 }}>
              <Link to="/login" style={{ color: '#333', fontWeight: 'bold' }}>
                Log in
              </Link>{' '}
              and register for this event to participate in the discussion.
            </p>
          ) : role === 'participant' ? (
            <p style={{ margin: 0 }}>
              📝 You must be <strong>registered for this event</strong> to post in the forum.
              Register above to join the discussion!
            </p>
          ) : role === 'organizer' ? (
            <p style={{ margin: 0 }}>Only the event's organizer can post in the forum.</p>
          ) : (
            <p style={{ margin: 0 }}>You don't have permission to post in this forum.</p>
          )}
        </div>
      )}

      {/* Thread View */}
      {activeThread && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            border: '1px solid #ccc',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h4 style={{ margin: 0, color: '#333' }}>Thread</h4>
            <button
              onClick={() => {
                setActiveThread(null);
                setThreadReplies([]);
                setReplyContent('');
              }}
              style={{
                border: 'none',
                background: '#333',
                color: 'white',
                borderRadius: '4px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ✕ Close Thread
            </button>
          </div>

          {renderMessageCard(activeThread, true)}

          <div style={{ marginLeft: '20px', borderLeft: '2px solid #ddd', paddingLeft: '16px' }}>
            {threadReplies.length > 0 ? (
              threadReplies.map((reply) => renderMessageCard(reply, true))
            ) : (
              <p style={{ color: '#888', fontSize: '14px' }}>No replies yet.</p>
            )}
          </div>

          {canPost && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                onKeyDown={(e) => e.key === 'Enter' && handlePostReply()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={handlePostReply}
                disabled={postingMessage || !replyContent.trim()}
                className="btn btn-primary"
                style={{ padding: '8px 16px' }}
              >
                Reply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages List */}
      {forumLoading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Loading messages...</p>
      ) : forumMessages.length > 0 ? (
        <>
          {forumMessages.filter((m) => !m.isAnnouncement).map((msg) => renderMessageCard(msg))}

          {/* Pagination */}
          {forumPagination && forumPagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              {Array.from({ length: forumPagination.pages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => fetchForumMessages(i + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: forumPage === i + 1 ? '2px solid #333' : '1px solid #ddd',
                    background: forumPage === i + 1 ? '#333' : 'white',
                    color: forumPage === i + 1 ? 'white' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
          No messages yet.{' '}
          {canPost ? 'Be the first to start a discussion!' : 'Register for this event to start a discussion!'}
        </p>
      )}
    </div>
  );
};

export default DiscussionForum;
