import { Octokit } from 'octokit';
import { storage } from './storage';

// GitHub API service
export class GitHubService {
  private octokit: Octokit | null = null;
  private user: { id: number; githubToken: string } | null = null;

  constructor(userId: number) {
    this.initializeWithUserId(userId);
  }

  /**
   * Initialize GitHub service with a user ID
   */
  async initializeWithUserId(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user?.githubToken) {
        console.error(`User #${userId} doesn't have a GitHub token configured`);
        return false;
      }
      
      this.user = { id: userId, githubToken: user.githubToken };
      this.octokit = new Octokit({ auth: user.githubToken });
      return true;
    } catch (error) {
      console.error('Failed to initialize GitHub service:', error);
      return false;
    }
  }

  /**
   * Check if the service is properly authenticated
   */
  isAuthenticated(): boolean {
    return !!this.octokit && !!this.user;
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser() {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    const { data } = await this.octokit!.rest.users.getAuthenticated();
    return data;
  }

  /**
   * List repositories for the authenticated user
   */
  async listRepositories() {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    const { data } = await this.octokit!.rest.repos.listForAuthenticatedUser();
    return data;
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string) {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    const { data } = await this.octokit!.rest.repos.get({ owner, repo });
    return data;
  }

  /**
   * List branches for a repository
   */
  async listBranches(owner: string, repo: string) {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    const { data } = await this.octokit!.rest.repos.listBranches({ owner, repo });
    return data;
  }

  /**
   * Get file content from repository
   */
  async getFileContent(owner: string, repo: string, path: string, ref?: string) {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    try {
      const { data } = await this.octokit!.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: ref || undefined
      });
      
      // Handle the different response types
      if (Array.isArray(data)) {
        // It's a directory
        return { type: 'directory', content: data };
      } else if ('content' in data) {
        // It's a file with content
        // @ts-ignore - we know content exists based on the check above
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return { 
          type: 'file', 
          content,
          // @ts-ignore - we know sha exists in the file response
          sha: data.sha
        };
      } else {
        // It's a submodule or something else
        return { type: 'other', content: null };
      }
    } catch (error: any) {
      if (error.status === 404) {
        return { type: 'not_found', content: null };
      }
      throw error;
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: string, 
    message: string,
    branch?: string,
    sha?: string // Required for updates, not for creation
  ) {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    const contentBase64 = Buffer.from(content).toString('base64');
    
    const { data } = await this.octokit!.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentBase64,
      branch: branch || undefined,
      sha: sha || undefined
    });
    
    return data;
  }

  /**
   * Create a commit with multiple file changes
   */
  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    changes: Array<{
      path: string;
      content: string;
    }>
  ) {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    // Get the latest commit SHA for the branch
    const { data: refData } = await this.octokit!.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    
    const latestCommitSha = refData.object.sha;
    
    // Get the commit to get the tree SHA
    const { data: commitData } = await this.octokit!.rest.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha
    });
    
    const baseTreeSha = commitData.tree.sha;
    
    // Create blobs for each file
    const blobs = await Promise.all(
      changes.map(async ({ content }) => {
        const { data } = await this.octokit!.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64'
        });
        
        return data.sha;
      })
    );
    
    // Create a new tree with the new blobs
    const { data: newTree } = await this.octokit!.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: changes.map(({ path }, index) => ({
        path,
        mode: '100644', // Normal file
        type: 'blob',
        sha: blobs[index]
      }))
    });
    
    // Create a new commit
    const { data: newCommit } = await this.octokit!.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha]
    });
    
    // Update the reference
    await this.octokit!.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha
    });
    
    return newCommit;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string, // Source branch
    base: string, // Target branch
    body?: string
  ) {
    if (!this.isAuthenticated()) {
      throw new Error('GitHub service not authenticated');
    }
    
    const { data } = await this.octokit!.rest.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body: body || undefined
    });
    
    return data;
  }
}

/**
 * Factory function to create a GitHub service for a user
 */
export async function createGitHubService(userId: number): Promise<GitHubService> {
  const service = new GitHubService(userId);
  await service.initializeWithUserId(userId);
  return service;
}