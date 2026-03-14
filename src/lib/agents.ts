export interface AgentRole {
  id: string;
  name: string;
  title: string;
  color: string;
  avatar: string;
  description: string;
  systemPrompt: string;
}

export interface AgentAssignment {
  agentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

/**
 * No default agents — groups create their own.
 * This empty array is used as a fallback when no agents are configured.
 */
export const AGENTS: AgentRole[] = [];

export function getAgent(id: string, agents: AgentRole[]): AgentRole | undefined {
  return agents.find((a) => a.id === id);
}
