/**
 * Best Practices Database
 * 
 * Manages a collection of development best practices, patterns,
 * and solutions shared by the community
 */

import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('BestPracticesDB');

/**
 * Best practice entry structure
 */
export interface BestPractice {
  id: string;
  title: string;
  summary: string;
  content: string; // Markdown format
  category: PracticeCategory;
  subcategory?: string;
  tags: string[];
  
  // Metadata
  author: {
    id: string;
    name: string;
    avatar?: string;
    reputation?: number;
  };
  contributors?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
  version: number;
  
  // Engagement
  views: number;
  likes: number;
  bookmarks: number;
  shares: number;
  
  // Quality indicators
  verified: boolean;
  expertReviewed: boolean;
  communityScore: number; // 0-100
  
  // Related content
  relatedPractices?: string[];
  codeExamples?: CodeExample[];
  resources?: Resource[];
  discussions?: Discussion[];
  
  // Applicability
  frameworks?: string[];
  languages?: string[];
  tools?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  timeToImplement?: string; // e.g., "30 minutes", "2 hours"
}

export type PracticeCategory = 
  | 'architecture'
  | 'performance'
  | 'security'
  | 'testing'
  | 'deployment'
  | 'monitoring'
  | 'documentation'
  | 'code-quality'
  | 'design-patterns'
  | 'debugging'
  | 'collaboration'
  | 'tooling'
  | 'accessibility'
  | 'internationalization'
  | 'data-management'
  | 'error-handling'
  | 'logging'
  | 'api-design'
  | 'ui-ux'
  | 'devops';

export interface CodeExample {
  id: string;
  title: string;
  description?: string;
  language: string;
  code: string;
  highlights?: Array<{
    line: number;
    description: string;
  }>;
  runnable?: boolean;
  output?: string;
}

export interface Resource {
  type: 'article' | 'video' | 'book' | 'course' | 'tool' | 'library';
  title: string;
  url: string;
  description?: string;
  author?: string;
  free?: boolean;
}

export interface Discussion {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  likes: number;
  replies?: Discussion[];
}

export interface SearchCriteria {
  query?: string;
  categories?: PracticeCategory[];
  tags?: string[];
  frameworks?: string[];
  languages?: string[];
  difficulty?: string[];
  verified?: boolean;
  expertReviewed?: boolean;
  minScore?: number;
  author?: string;
  sortBy?: 'relevance' | 'popularity' | 'date' | 'score';
  limit?: number;
  offset?: number;
}

export interface ContributionRequest {
  practiceId?: string; // For updates
  title: string;
  summary: string;
  content: string;
  category: PracticeCategory;
  subcategory?: string;
  tags: string[];
  codeExamples?: CodeExample[];
  resources?: Resource[];
  frameworks?: string[];
  languages?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  timeToImplement?: string;
}

export interface Review {
  id: string;
  practiceId: string;
  reviewer: {
    id: string;
    name: string;
    isExpert: boolean;
  };
  rating: number; // 1-5
  feedback: string;
  suggestions?: string[];
  timestamp: Date;
  helpful: number; // Number of users who found this review helpful
}

export class BestPracticesDB {
  private practices = new Map<string, BestPractice>();
  private index = new Map<string, Set<string>>(); // For fast searching
  private userBookmarks = new Map<string, Set<string>>();
  private userLikes = new Map<string, Set<string>>();
  private reviews = new Map<string, Review[]>();
  
  constructor() {
    this.initializeWithExamples();
    this.buildIndex();
  }
  
  /**
   * Search for best practices
   */
  async search(criteria: SearchCriteria = {}): Promise<BestPractice[]> {
    logger.info('Searching best practices:', criteria);
    
    let results = Array.from(this.practices.values());
    
    // Filter by query
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      const queryTerms = query.split(/\s+/);
      
      results = results.filter(practice => {
        const searchText = [
          practice.title,
          practice.summary,
          practice.content,
          ...practice.tags
        ].join(' ').toLowerCase();
        
        return queryTerms.every(term => searchText.includes(term));
      });
    }
    
    // Filter by categories
    if (criteria.categories && criteria.categories.length > 0) {
      results = results.filter(p => 
        criteria.categories!.includes(p.category)
      );
    }
    
    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(p => 
        criteria.tags!.some(tag => p.tags.includes(tag))
      );
    }
    
    // Filter by frameworks
    if (criteria.frameworks && criteria.frameworks.length > 0) {
      results = results.filter(p => 
        p.frameworks?.some(f => criteria.frameworks!.includes(f))
      );
    }
    
    // Filter by languages
    if (criteria.languages && criteria.languages.length > 0) {
      results = results.filter(p => 
        p.languages?.some(l => criteria.languages!.includes(l))
      );
    }
    
    // Filter by difficulty
    if (criteria.difficulty && criteria.difficulty.length > 0) {
      results = results.filter(p => 
        criteria.difficulty!.includes(p.difficulty)
      );
    }
    
    // Filter by quality indicators
    if (criteria.verified !== undefined) {
      results = results.filter(p => p.verified === criteria.verified);
    }
    
    if (criteria.expertReviewed !== undefined) {
      results = results.filter(p => p.expertReviewed === criteria.expertReviewed);
    }
    
    if (criteria.minScore !== undefined) {
      results = results.filter(p => p.communityScore >= criteria.minScore!);
    }
    
    // Filter by author
    if (criteria.author) {
      results = results.filter(p => 
        p.author.name.toLowerCase().includes(criteria.author!.toLowerCase()) ||
        p.author.id === criteria.author
      );
    }
    
    // Sort results
    results = this.sortResults(results, criteria.sortBy || 'relevance', criteria.query);
    
    // Apply pagination
    const limit = criteria.limit || 20;
    const offset = criteria.offset || 0;
    
    return results.slice(offset, offset + limit);
  }
  
  /**
   * Get a specific best practice
   */
  async getPractice(practiceId: string): Promise<BestPractice | undefined> {
    const practice = this.practices.get(practiceId);
    
    if (practice) {
      // Increment view count
      practice.views++;
    }
    
    return practice;
  }
  
  /**
   * Get related practices
   */
  async getRelatedPractices(practiceId: string, limit: number = 5): Promise<BestPractice[]> {
    const practice = this.practices.get(practiceId);
    
    if (!practice) {
      return [];
    }
    
    const related: BestPractice[] = [];
    
    // Get explicitly related practices
    if (practice.relatedPractices) {
      for (const relatedId of practice.relatedPractices) {
        const relatedPractice = this.practices.get(relatedId);
        if (relatedPractice) {
          related.push(relatedPractice);
        }
      }
    }
    
    // Find similar practices by tags and category
    if (related.length < limit) {
      const similar = await this.search({
        categories: [practice.category],
        tags: practice.tags,
        limit: limit - related.length + 5 // Get extras to filter out current
      });
      
      for (const similarPractice of similar) {
        if (similarPractice.id !== practiceId && 
            !related.find(r => r.id === similarPractice.id)) {
          related.push(similarPractice);
          if (related.length >= limit) break;
        }
      }
    }
    
    return related.slice(0, limit);
  }
  
  /**
   * Submit a new best practice
   */
  async submitPractice(contribution: ContributionRequest): Promise<BestPractice> {
    logger.info('Submitting new best practice:', contribution.title);
    
    const practice: BestPractice = {
      id: this.generateId(),
      title: contribution.title,
      summary: contribution.summary,
      content: contribution.content,
      category: contribution.category,
      subcategory: contribution.subcategory,
      tags: contribution.tags,
      author: {
        id: 'current-user', // Would get from auth context
        name: 'Current User',
        reputation: 100
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      views: 0,
      likes: 0,
      bookmarks: 0,
      shares: 0,
      verified: false,
      expertReviewed: false,
      communityScore: 50, // Start at neutral
      codeExamples: contribution.codeExamples,
      resources: contribution.resources,
      frameworks: contribution.frameworks,
      languages: contribution.languages,
      difficulty: contribution.difficulty,
      timeToImplement: contribution.timeToImplement
    };
    
    this.practices.set(practice.id, practice);
    this.updateIndex(practice);
    
    return practice;
  }
  
  /**
   * Update an existing practice
   */
  async updatePractice(
    practiceId: string, 
    updates: Partial<ContributionRequest>
  ): Promise<BestPractice | undefined> {
    const practice = this.practices.get(practiceId);
    
    if (!practice) {
      return undefined;
    }
    
    // Update fields
    Object.assign(practice, {
      ...updates,
      updatedAt: new Date(),
      version: practice.version + 1
    });
    
    this.updateIndex(practice);
    
    return practice;
  }
  
  /**
   * Like a practice
   */
  async likePractice(practiceId: string, userId: string): Promise<void> {
    const practice = this.practices.get(practiceId);
    
    if (!practice) {
      throw new Error(`Practice ${practiceId} not found`);
    }
    
    let userLikes = this.userLikes.get(userId);
    if (!userLikes) {
      userLikes = new Set();
      this.userLikes.set(userId, userLikes);
    }
    
    if (!userLikes.has(practiceId)) {
      userLikes.add(practiceId);
      practice.likes++;
      this.updateCommunityScore(practice);
    }
  }
  
  /**
   * Bookmark a practice
   */
  async bookmarkPractice(practiceId: string, userId: string): Promise<void> {
    const practice = this.practices.get(practiceId);
    
    if (!practice) {
      throw new Error(`Practice ${practiceId} not found`);
    }
    
    let userBookmarks = this.userBookmarks.get(userId);
    if (!userBookmarks) {
      userBookmarks = new Set();
      this.userBookmarks.set(userId, userBookmarks);
    }
    
    if (!userBookmarks.has(practiceId)) {
      userBookmarks.add(practiceId);
      practice.bookmarks++;
      this.updateCommunityScore(practice);
    }
  }
  
  /**
   * Submit a review
   */
  async submitReview(review: Omit<Review, 'id' | 'timestamp'>): Promise<Review> {
    const practice = this.practices.get(review.practiceId);
    
    if (!practice) {
      throw new Error(`Practice ${review.practiceId} not found`);
    }
    
    const fullReview: Review = {
      ...review,
      id: this.generateId(),
      timestamp: new Date(),
      helpful: 0
    };
    
    let reviews = this.reviews.get(review.practiceId);
    if (!reviews) {
      reviews = [];
      this.reviews.set(review.practiceId, reviews);
    }
    
    reviews.push(fullReview);
    
    // Update expert reviewed status
    if (review.reviewer.isExpert && review.rating >= 4) {
      practice.expertReviewed = true;
    }
    
    this.updateCommunityScore(practice);
    
    return fullReview;
  }
  
  /**
   * Get reviews for a practice
   */
  async getReviews(practiceId: string): Promise<Review[]> {
    return this.reviews.get(practiceId) || [];
  }
  
  /**
   * Get trending practices
   */
  async getTrendingPractices(limit: number = 10): Promise<BestPractice[]> {
    const practices = Array.from(this.practices.values());
    
    // Calculate trend score based on recent activity
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    const withTrendScore = practices.map(p => {
      const ageInDays = (now - p.createdAt.getTime()) / dayInMs;
      const recentViews = p.views / Math.max(1, ageInDays);
      const recentLikes = p.likes / Math.max(1, ageInDays);
      const trendScore = recentViews * 0.3 + recentLikes * 0.7;
      
      return { practice: p, trendScore };
    });
    
    withTrendScore.sort((a, b) => b.trendScore - a.trendScore);
    
    return withTrendScore.slice(0, limit).map(item => item.practice);
  }
  
  /**
   * Get practices by category
   */
  async getPracticesByCategory(category: PracticeCategory, limit?: number): Promise<BestPractice[]> {
    return this.search({ categories: [category], limit });
  }
  
  /**
   * Get user's bookmarked practices
   */
  async getUserBookmarks(userId: string): Promise<BestPractice[]> {
    const bookmarkIds = this.userBookmarks.get(userId);
    
    if (!bookmarkIds) {
      return [];
    }
    
    const practices: BestPractice[] = [];
    
    for (const id of bookmarkIds) {
      const practice = this.practices.get(id);
      if (practice) {
        practices.push(practice);
      }
    }
    
    return practices;
  }
  
  /**
   * Sort search results
   */
  private sortResults(
    results: BestPractice[],
    sortBy: string,
    query?: string
  ): BestPractice[] {
    switch (sortBy) {
      case 'popularity':
        return results.sort((a, b) => {
          const scoreA = a.views + a.likes * 2 + a.bookmarks * 3;
          const scoreB = b.views + b.likes * 2 + b.bookmarks * 3;
          return scoreB - scoreA;
        });
        
      case 'date':
        return results.sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        );
        
      case 'score':
        return results.sort((a, b) => b.communityScore - a.communityScore);
        
      case 'relevance':
      default:
        if (!query) {
          return results.sort((a, b) => b.communityScore - a.communityScore);
        }
        
        // Calculate relevance score based on query match
        const scoredResults = results.map(practice => {
          let score = 0;
          const q = query.toLowerCase();
          
          // Title match (highest weight)
          if (practice.title.toLowerCase().includes(q)) {
            score += 10;
          }
          
          // Summary match
          if (practice.summary.toLowerCase().includes(q)) {
            score += 5;
          }
          
          // Tag match
          if (practice.tags.some(tag => tag.toLowerCase().includes(q))) {
            score += 3;
          }
          
          // Content match
          if (practice.content.toLowerCase().includes(q)) {
            score += 1;
          }
          
          // Boost by community score
          score += practice.communityScore / 20;
          
          return { practice, score };
        });
        
        scoredResults.sort((a, b) => b.score - a.score);
        
        return scoredResults.map(item => item.practice);
    }
  }
  
  /**
   * Update community score based on engagement
   */
  private updateCommunityScore(practice: BestPractice): void {
    // Base score from engagement
    let score = 50;
    
    // Views (normalized, max 10 points)
    score += Math.min(10, practice.views / 100);
    
    // Likes (max 20 points)
    score += Math.min(20, practice.likes / 10);
    
    // Bookmarks (max 15 points)
    score += Math.min(15, practice.bookmarks / 5);
    
    // Expert review bonus
    if (practice.expertReviewed) {
      score += 10;
    }
    
    // Verified bonus
    if (practice.verified) {
      score += 5;
    }
    
    // Review average (if any)
    const reviews = this.reviews.get(practice.id);
    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      score += avgRating * 2; // Max 10 points
    }
    
    practice.communityScore = Math.min(100, Math.round(score));
  }
  
  /**
   * Build search index
   */
  private buildIndex(): void {
    for (const practice of this.practices.values()) {
      this.updateIndex(practice);
    }
  }
  
  /**
   * Update search index for a practice
   */
  private updateIndex(practice: BestPractice): void {
    // Index by category
    this.addToIndex(`category:${practice.category}`, practice.id);
    
    // Index by tags
    for (const tag of practice.tags) {
      this.addToIndex(`tag:${tag}`, practice.id);
    }
    
    // Index by frameworks
    if (practice.frameworks) {
      for (const framework of practice.frameworks) {
        this.addToIndex(`framework:${framework}`, practice.id);
      }
    }
    
    // Index by languages
    if (practice.languages) {
      for (const language of practice.languages) {
        this.addToIndex(`language:${language}`, practice.id);
      }
    }
    
    // Index by difficulty
    this.addToIndex(`difficulty:${practice.difficulty}`, practice.id);
  }
  
  /**
   * Add to index
   */
  private addToIndex(key: string, practiceId: string): void {
    let ids = this.index.get(key);
    if (!ids) {
      ids = new Set();
      this.index.set(key, ids);
    }
    ids.add(practiceId);
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Initialize with example best practices
   */
  private initializeWithExamples(): void {
    // Example: React Performance
    this.practices.set('react-performance-1', {
      id: 'react-performance-1',
      title: 'Optimizing React Re-renders with useMemo and useCallback',
      summary: 'Learn how to prevent unnecessary re-renders in React applications using memoization hooks',
      content: `# Optimizing React Re-renders

React's re-rendering behavior can cause performance issues in complex applications. Here's how to optimize it...

## When to Use useMemo

The \`useMemo\` hook memoizes expensive computations...

## When to Use useCallback

The \`useCallback\` hook prevents function recreation...`,
      category: 'performance',
      subcategory: 'react-optimization',
      tags: ['react', 'performance', 'hooks', 'memoization'],
      author: {
        id: 'expert-1',
        name: 'React Expert',
        reputation: 1500
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      version: 2,
      views: 5420,
      likes: 234,
      bookmarks: 156,
      shares: 89,
      verified: true,
      expertReviewed: true,
      communityScore: 92,
      frameworks: ['React'],
      languages: ['JavaScript', 'TypeScript'],
      difficulty: 'intermediate',
      timeToImplement: '1 hour',
      codeExamples: [
        {
          id: 'example-1',
          title: 'useMemo Example',
          language: 'typescript',
          code: `const ExpensiveComponent = ({ data }: Props) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveOperation(item));
  }, [data]);
  
  return <DataDisplay data={processedData} />;
};`
        }
      ]
    });
    
    // Example: API Security
    this.practices.set('api-security-1', {
      id: 'api-security-1',
      title: 'Implementing Rate Limiting in REST APIs',
      summary: 'Protect your API from abuse with proper rate limiting strategies',
      content: `# Rate Limiting Best Practices

Rate limiting is crucial for API security and stability...`,
      category: 'security',
      tags: ['api', 'security', 'rate-limiting', 'backend'],
      author: {
        id: 'security-expert',
        name: 'Security Specialist',
        reputation: 2000
      },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
      version: 1,
      views: 3200,
      likes: 145,
      bookmarks: 98,
      shares: 56,
      verified: true,
      expertReviewed: false,
      communityScore: 78,
      frameworks: ['Express', 'Fastify'],
      languages: ['JavaScript', 'TypeScript'],
      difficulty: 'intermediate',
      timeToImplement: '2 hours'
    });
  }
}