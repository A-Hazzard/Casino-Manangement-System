export type Member = {
  _id: string;
  name: string;
  memberId: string;
  accountLocked: boolean;
  areaCode: string;
  authType: number;
  createdAt: string;
  currentSession: string;
  deletedAt: string | null;
  freePlayAwardId: number;
  freePlayCredits: number;
  accountBalance: number;
  gamingLocation: string;
  locationName?: string; // Added for location display
  lastLogin: string | null;
  lastPwUpdatedAt: string | null;
  lastfplAwardAt: string | null;
  loggedIn: boolean;
  nonRestricted: number;
  numFailedLoginAttempts: number;
  phoneNumber: string;
  pin: string;
  points: number;
  profile: {
    indentification: {
      number: string;
      type: string;
    };
    firstName: string;
    lastName: string;
    gender: string;
    dob: string;
    email: string;
    address: string;
    occupation: string;
  };
  relayId: string;
  restricted: number;
  smsCode: number;
  smsCodeTime: string | null;
  uaccount: number;
  ulock: number;
  upassFull: number;
  updatedAt: string;
  username: string;
  utype: number;
  uvalid: number;
  // Win/Loss calculations
  winLoss?: number; // Calculated from sessions (drop - totalCancelledCredits)
  totalMoneyIn?: number; // Total drop from sessions
  totalMoneyOut?: number; // Total cancelled credits from sessions
  sessions: MemberSession[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalSessions: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type MemberSession = {
  _id: string;
  sessionId?: string;
  machineId?: string;
  time?: string;
  sessionLength?: string;
  handle?: number;
  moneyIn?: number; // Physical cash inserted (movement.drop)
  moneyOut?: number; // Manual payouts (movement.totalCancelledCredits)
  cancelledCredits?: number; // Legacy field - use moneyOut instead
  jackpot?: number;
  won?: number;
  bet?: number;
  wonLess?: number;
  points?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  coinIn?: number;
  coinOut?: number;
  duration?: number;
};

export type MemberSortOption =
  | "name"
  | "playerId"
  | "points"
  | "sessions"
  | "totalHandle"
  | "totalWon"
  | "totalLost"
  | "lastSession"
  | "status"
  | "locationName"
  | "winLoss"
  | "lastLogin";

export type MemberFilter = "active" | "inactive" | "all";

export type MemberCardData = {
  member: Member;
  onMemberClick: (id: string) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
};

export type MemberTableProps = {
  members: Member[];
  onSort: (column: MemberSortOption) => void;
  sortOption: MemberSortOption;
  sortOrder: "asc" | "desc";
  onMemberClick: (id: string) => void;
  onAction: (action: "edit" | "delete", member: Member) => void;
  formatCurrency: (amount: number) => string;
};

export type MemberDetailsProps = {
  member: Member;
  sessions: MemberSession[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onBack: () => void;
};

export type MemberActionsState = {
  selectedMember: Partial<Member>;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (member: Partial<Member>) => void;
  openDeleteModal: (member: Partial<Member>) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

export type MemberSummary = {
  _id: string;
  fullName: string;
  address: string;
  phoneNumber: string;
  lastLogin?: string;
  createdAt: string;
  locationName: string;
  gamingLocation: string;
  winLoss?: number; // Win/Loss calculation
  totalMoneyIn?: number; // Total money in
  totalMoneyOut?: number; // Total money out
};

export type SummaryStats = {
  totalMembers: number;
  totalLocations: number;
  recentMembers: number;
};

export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
};

export type Location = {
  _id: string;
  name: string;
};

// New types for merged members page
export type MembersView = "members" | "summary-report";

export type MembersTab = {
  id: MembersView;
  label: string;
  icon: string;
  description: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
};
