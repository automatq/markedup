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
