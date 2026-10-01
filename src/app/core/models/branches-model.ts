export interface BranchModel {
  id: number;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
  actionedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchResponse {
  status: number;
  message: string;
  data: BranchModel[];
  timestamp: string;
}