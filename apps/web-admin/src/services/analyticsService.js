import { axiosInstance } from '../api';
import logger from '../utils/logger';

class AnalyticsService {
  trackEvent(eventType, eventName, metadata = {}) {
    try {
      const eventData = {
        eventType,
        eventName,
        sessionId: this.getSessionId(),
        metadata,
        timestamp: new Date().toISOString(),
      };

      axiosInstance.post('/analytics/track', eventData).catch((error) => {
        logger.error('Failed to track event:', error);
      });
    } catch (error) {
      logger.error('Error tracking event:', error);
    }
  }

  trackPageView(path) {
    this.trackEvent('page_view', 'Page Viewed', { path });
  }

  trackInquirySubmitted(inquiryId) {
    this.trackEvent('inquiry_submitted', 'Inquiry Submitted', { inquiryId });
  }

  trackUserAction(action, details = {}) {
    this.trackEvent('user_action', action, details);
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }
}

export default new AnalyticsService();
