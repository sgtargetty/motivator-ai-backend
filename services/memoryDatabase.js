// services/memoryDatabase.js - Advanced Memory & Learning System
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MemoryDatabase {
  constructor() {
    this.memoryPath = path.join(process.cwd(), 'data/user_memories.json');
    this.patternsPath = path.join(process.cwd(), 'data/learning_patterns.json');
    this.conversationsPath = path.join(process.cwd(), 'data/conversations.json');
    
    // Ensure data directory exists
    this.ensureDataDirectories();
    
    // Load existing data
    this.userMemories = this.loadFromFile(this.memoryPath) || {};
    this.learningPatterns = this.loadFromFile(this.patternsPath) || {};
    this.conversations = this.loadFromFile(this.conversationsPath) || {};
    
    console.log("🧠 Memory Database initialized");
  }

  ensureDataDirectories() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadFromFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`❌ Error loading ${filePath}:`, error);
    }
    return {};
  }

  saveToFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`❌ Error saving ${filePath}:`, error);
    }
  }

  // 👤 USER MEMORY MANAGEMENT
  getUserMemory(userId) {
    if (!this.userMemories[userId]) {
      this.userMemories[userId] = {
        userId,
        createdAt: new Date().toISOString(),
        profile: {
          name: null,
          timezone: null,
          preferredPersonality: 'Lana Croft',
          motivationStyle: 'encouraging',
          goals: [],
          interests: [],
          challenges: []
        },
        behavioral: {
          conversationFrequency: 'new',
          preferredTimes: [],
          sessionLengths: [],
          responsePatterns: [],
          emotionalTriggers: [],
          successPatterns: []
        },
        learning: {
          motivationTriggers: new Map(),
          effectiveStrategies: new Map(),
          personalKeywords: new Map(),
          contextualPreferences: new Map()
        },
        conversations: {
          total: 0,
          lastConversation: null,
          averageLength: 0,
          topics: new Map(),
          satisfactionScores: []
        },
        analytics: {
          engagementScore: 0,
          progressScore: 0,
          consistencyScore: 0,
          learningAccuracy: 0
        },
        lastUpdated: new Date().toISOString()
      };
    }
    return this.userMemories[userId];
  }

  updateUserMemory(userId, updates) {
    const memory = this.getUserMemory(userId);
    
    // Deep merge updates
    this.deepMerge(memory, updates);
    memory.lastUpdated = new Date().toISOString();
    
    this.userMemories[userId] = memory;
    this.saveToFile(this.memoryPath, this.userMemories);
    
    console.log(`🧠 Memory updated for user ${userId}`);
    return memory;
  }

  // 🎯 CONVERSATION MANAGEMENT
  saveConversation(userId, conversationData) {
    const conversationId = conversationData.conversationId || this.generateId('conv');
    
    if (!this.conversations[userId]) {
      this.conversations[userId] = [];
    }
    
    const conversation = {
      id: conversationId,
      userId,
      personality: conversationData.personality,
      startTime: conversationData.startTime || new Date().toISOString(),
      endTime: new Date().toISOString(),
      messages: conversationData.messages || [],
      duration: conversationData.duration || 0,
      topics: conversationData.topics || [],
      sentiment: conversationData.sentiment || 'neutral',
      satisfactionScore: conversationData.satisfactionScore || null,
      insights: conversationData.insights || [],
      learningExtracted: conversationData.learningExtracted || false
    };
    
    this.conversations[userId].push(conversation);
    
    // Keep only last 100 conversations per user
    if (this.conversations[userId].length > 100) {
      this.conversations[userId] = this.conversations[userId].slice(-100);
    }
    
    this.saveToFile(this.conversationsPath, this.conversations);
    
    // Update user memory with conversation insights
    this.extractLearningFromConversation(userId, conversation);
    
    return conversation;
  }

  getConversationHistory(userId, limit = 10) {
    const userConversations = this.conversations[userId] || [];
    return userConversations
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, limit);
  }

  // 🤖 LEARNING PATTERN EXTRACTION
  extractLearningFromConversation(userId, conversation) {
    const memory = this.getUserMemory(userId);
    const patterns = this.analyzeConversationPatterns(conversation);
    
    // Update conversation statistics
    memory.conversations.total += 1;
    memory.conversations.lastConversation = conversation.endTime;
    
    // Update topics map
    patterns.topics.forEach(topic => {
      const currentCount = memory.conversations.topics.get(topic) || 0;
      memory.conversations.topics.set(topic, currentCount + 1);
    });
    
    // Update motivation triggers
    patterns.motivationTriggers.forEach(trigger => {
      const currentStrength = memory.learning.motivationTriggers.get(trigger) || 0;
      memory.learning.motivationTriggers.set(trigger, currentStrength + 1);
    });
    
    // Update effective strategies
    if (patterns.effectiveStrategies.length > 0) {
      patterns.effectiveStrategies.forEach(strategy => {
        const currentEffectiveness = memory.learning.effectiveStrategies.get(strategy) || 0;
        memory.learning.effectiveStrategies.set(strategy, currentEffectiveness + 1);
      });
    }
    
    // Update personal keywords
    patterns.personalKeywords.forEach(keyword => {
      const currentFrequency = memory.learning.personalKeywords.get(keyword) || 0;
      memory.learning.personalKeywords.set(keyword, currentFrequency + 1);
    });
    
    // Calculate new analytics scores
    this.updateAnalyticsScores(userId, memory, patterns);
    
    this.updateUserMemory(userId, memory);
    
    console.log(`🧠 Learning extracted from conversation for user ${userId}`);
    return patterns;
  }

  analyzeConversationPatterns(conversation) {
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    const aiMessages = conversation.messages.filter(m => m.role === 'assistant');
    
    // Extract topics
    const topics = this.extractTopics(userMessages);
    
    // Extract motivation triggers
    const motivationTriggers = this.extractMotivationTriggers(userMessages);
    
    // Extract effective strategies (based on positive user responses)
    const effectiveStrategies = this.extractEffectiveStrategies(userMessages, aiMessages);
    
    // Extract personal keywords
    const personalKeywords = this.extractPersonalKeywords(userMessages);
    
    // Analyze sentiment progression
    const sentimentProgression = this.analyzeSentimentProgression(conversation.messages);
    
    return {
      topics,
      motivationTriggers,
      effectiveStrategies,
      personalKeywords,
      sentimentProgression,
      conversationLength: conversation.messages.length,
      duration: conversation.duration
    };
  }

  extractTopics(messages) {
    const topicKeywords = {
      'workout': ['workout', 'exercise', 'gym', 'fitness', 'training'],
      'work': ['work', 'job', 'career', 'project', 'meeting', 'deadline'],
      'goals': ['goal', 'achieve', 'target', 'aim', 'objective'],
      'stress': ['stress', 'anxious', 'worried', 'overwhelmed', 'pressure'],
      'motivation': ['motivation', 'inspire', 'encourage', 'boost'],
      'habits': ['habit', 'routine', 'daily', 'consistency', 'practice']
    };
    
    const topics = new Set();
    const messageText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => messageText.includes(keyword))) {
        topics.add(topic);
      }
    });
    
    return Array.from(topics);
  }

  extractMotivationTriggers(messages) {
    const triggerKeywords = {
      'low_energy': ['tired', 'exhausted', 'low energy', 'drained'],
      'stress': ['stressed', 'overwhelmed', 'pressure', 'anxious'],
      'procrastination': ['procrastinating', 'putting off', 'delay', 'avoiding'],
      'self_doubt': ['doubt', 'uncertain', 'not sure', 'worried'],
      'lack_focus': ['distracted', 'unfocused', 'scattered', 'all over']
    };
    
    const triggers = new Set();
    const messageText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    Object.entries(triggerKeywords).forEach(([trigger, keywords]) => {
      if (keywords.some(keyword => messageText.includes(keyword))) {
        triggers.add(trigger);
      }
    });
    
    return Array.from(triggers);
  }

  extractEffectiveStrategies(userMessages, aiMessages) {
    // Analyze which AI strategies led to positive user responses
    const strategies = [];
    
    // Look for positive responses after AI suggestions
    for (let i = 0; i < aiMessages.length - 1; i++) {
      const aiMessage = aiMessages[i].content.toLowerCase();
      const nextUserMessage = userMessages[i + 1]?.content.toLowerCase() || '';
      
      const positiveIndicators = ['yes', 'great', 'thanks', 'helpful', 'good idea', 'will do'];
      const hasPositiveResponse = positiveIndicators.some(indicator => 
        nextUserMessage.includes(indicator)
      );
      
      if (hasPositiveResponse) {
        // Extract strategy from AI message
        if (aiMessage.includes('adventure') || aiMessage.includes('explore')) {
          strategies.push('adventure_metaphors');
        }
        if (aiMessage.includes('step by step') || aiMessage.includes('break it down')) {
          strategies.push('step_by_step');
        }
        if (aiMessage.includes('celebrate') || aiMessage.includes('achievement')) {
          strategies.push('celebration_focus');
        }
      }
    }
    
    return strategies;
  }

  extractPersonalKeywords(messages) {
    const keywords = new Map();
    const messageText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    // Extract frequently mentioned words (excluding common words)
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cant', 'wont', 'dont', 'doesnt', 'didnt', 'isnt', 'arent', 'wasnt', 'werent', 'havent', 'hasnt', 'hadnt', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const words = messageText.split(/\s+/);
    words.forEach(word => {
      word = word.replace(/[^\w]/g, '');
      if (word.length > 3 && !commonWords.has(word)) {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      }
    });
    
    // Return only words mentioned more than once
    const frequentKeywords = new Map();
    keywords.forEach((count, word) => {
      if (count > 1) {
        frequentKeywords.set(word, count);
      }
    });
    
    return frequentKeywords;
  }

  analyzeSentimentProgression(messages) {
    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'great', 'amazing', 'awesome', 'fantastic', 'love', 'excited', 'happy', 'confident'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'worried', 'stressed', 'anxious', 'upset'];
    
    const sentiments = messages.map(message => {
      const text = message.content.toLowerCase();
      const positiveCount = positiveWords.filter(word => text.includes(word)).length;
      const negativeCount = negativeWords.filter(word => text.includes(word)).length;
      
      if (positiveCount > negativeCount) return 'positive';
      if (negativeCount > positiveCount) return 'negative';
      return 'neutral';
    });
    
    return sentiments;
  }

  updateAnalyticsScores(userId, memory, patterns) {
    // Engagement Score (0-100)
    const conversationFrequency = memory.conversations.total;
    const recentActivity = this.getRecentActivityScore(userId);
    memory.analytics.engagementScore = Math.min(100, 
      (conversationFrequency * 10) + (recentActivity * 50)
    );
    
    // Progress Score (0-100)
    const goalProgress = this.calculateGoalProgress(memory);
    const sentimentImprovement = this.calculateSentimentImprovement(patterns);
    memory.analytics.progressScore = Math.min(100,
      (goalProgress * 70) + (sentimentImprovement * 30)
    );
    
    // Consistency Score (0-100)
    memory.analytics.consistencyScore = this.calculateConsistencyScore(userId);
    
    // Learning Accuracy (0-100)
    memory.analytics.learningAccuracy = this.calculateLearningAccuracy(memory);
  }

  getRecentActivityScore(userId) {
    const conversations = this.conversations[userId] || [];
    const recentConversations = conversations.filter(conv => {
      const daysSince = (Date.now() - new Date(conv.startTime)) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });
    return Math.min(1, recentConversations.length / 7);
  }

  calculateGoalProgress(memory) {
    // Simplified goal progress calculation
    const goals = memory.profile.goals.length;
    const achievements = memory.behavioral.successPatterns.length;
    return goals > 0 ? Math.min(1, achievements / goals) : 0;
  }

  calculateSentimentImprovement(patterns) {
    const sentiments = patterns.sentimentProgression;
    if (sentiments.length < 2) return 0.5;
    
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    return positiveCount / sentiments.length;
  }

  calculateConsistencyScore(userId) {
    const conversations = this.conversations[userId] || [];
    if (conversations.length < 2) return 0;
    
    // Calculate consistency based on conversation frequency
    const timestamps = conversations.map(c => new Date(c.startTime)).sort();
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i] - timestamps[i-1];
      intervals.push(interval);
    }
    
    if (intervals.length === 0) return 0;
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    
    // Lower variance = higher consistency
    const consistencyRatio = 1 / (1 + Math.sqrt(variance) / avgInterval);
    return Math.min(100, consistencyRatio * 100);
  }

  calculateLearningAccuracy(memory) {
    // Placeholder for ML accuracy calculation
    const learningPoints = memory.learning.motivationTriggers.size + 
                          memory.learning.effectiveStrategies.size +
                          memory.learning.personalKeywords.size;
    return Math.min(100, learningPoints * 5);
  }

  // 🎯 PREDICTION & RECOMMENDATIONS
  generatePersonalizedRecommendations(userId) {
    const memory = this.getUserMemory(userId);
    const recommendations = [];
    
    // Time-based recommendations
    const preferredTimes = memory.behavioral.preferredTimes;
    if (preferredTimes.length > 0) {
      recommendations.push({
        type: 'timing',
        title: 'Optimal Conversation Time',
        description: `Based on your patterns, you're most engaged at ${preferredTimes[0]}`,
        confidence: 0.8
      });
    }
    
    // Personality recommendations
    const topTriggers = Array.from(memory.learning.motivationTriggers.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topTriggers.length > 0) {
      recommendations.push({
        type: 'motivation',
        title: 'Personalized Motivation Style',
        description: `You respond best to ${topTriggers[0][0]} focused conversations`,
        confidence: 0.9
      });
    }
    
    return recommendations;
  }

  // 🛠️ UTILITY FUNCTIONS
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 💾 BACKUP & EXPORT
  exportUserData(userId) {
    return {
      memory: this.userMemories[userId] || null,
      conversations: this.conversations[userId] || [],
      learningPatterns: this.learningPatterns[userId] || {},
      exportedAt: new Date().toISOString()
    };
  }

  importUserData(userId, data) {
    if (data.memory) {
      this.userMemories[userId] = data.memory;
    }
    if (data.conversations) {
      this.conversations[userId] = data.conversations;
    }
    if (data.learningPatterns) {
      this.learningPatterns[userId] = data.learningPatterns;
    }
    
    this.saveToFile(this.memoryPath, this.userMemories);
    this.saveToFile(this.conversationsPath, this.conversations);
    this.saveToFile(this.patternsPath, this.learningPatterns);
  }

  // 🧹 CLEANUP
  cleanupOldData(daysToKeep = 365) {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    
    Object.keys(this.conversations).forEach(userId => {
      this.conversations[userId] = this.conversations[userId].filter(conv => 
        new Date(conv.startTime) > cutoffDate
      );
    });
    
    this.saveToFile(this.conversationsPath, this.conversations);
    console.log(`🧹 Cleaned up conversations older than ${daysToKeep} days`);
  }
}

export default new MemoryDatabase();