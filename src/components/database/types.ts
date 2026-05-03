export interface DBProperty {
  id: string;
  type: string;
  name: string;
  config: any;
  sortOrder: number;
}

export interface DBRow {
  id: string;
  values: Record<string, any>;
  documentId: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBView {
  id: string;
  type: string; // "table" | "board" | "calendar" | "gallery" | "list"
  name: string;
  config: {
    groupBy?: string;
    sortBy?: { propertyId: string; direction: "asc" | "desc" };
    datePropertyId?: string;
    hiddenProperties?: string[];
    filters?: any[];
  };
  sortOrder: number;
}

export interface Database {
  id: string;
  workspaceId: string;
  documentId: string | null;
  title: string;
  icon: string | null;
  properties: DBProperty[];
  rows: DBRow[];
  views: DBView[];
}

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}
