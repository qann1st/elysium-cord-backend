export const USER_SELECT = {
  password: false,
  approveCode: false,
  forgotPassCode: false,
  createdAt: true,
  updatedAt: true,
  email: true,
  login: true,
  nickname: true,
  id: true,
  avatar: true,
  isOnline: true,
  isEmailApproved: true,
  bio: true,
  isMuted: true,
  isDeafen: true,
  isStreaming: true,
} as const;

export const USER_SELECT_ONLY_FRIENDS = {
  friends: { select: USER_SELECT },
  friendsIncomingRequests: { select: USER_SELECT },
  friendsOutgoingRequests: { select: USER_SELECT },
} as const;

export const USER_SELECT_WITH_FRIENDS = {
  ...USER_SELECT,
  ...USER_SELECT_ONLY_FRIENDS,
} as const;

export const USER_SELECT_IN_CHANNEL = {
  id: true,
  nickname: true,
  avatar: true,
  isMuted: true,
  isDeafen: true,
  isOnline: true,
  isStreaming: true,
  bio: true,
  login: true,
} as const;

export const ROLE_SELECT = {
  id: true,
  name: true,
  color: true,
  permissions: true,
  isDefault: true,
  order: true,
  memberships: {
    select: {
      id: true,
      user: { select: USER_SELECT_IN_CHANNEL },
      joinedServer: true,
    },
  },
} as const;

export const SERVER_MEMBER_SELECT = {
  id: true,
  user: { select: USER_SELECT_IN_CHANNEL },
  roles: {
    select: { ...ROLE_SELECT, memberships: false },
    where: {
      NOT: {
        isDefault: true,
      },
    },
    orderBy: { order: 'asc' },
  },
  channel: { select: { id: true, name: true, categoryId: true } },
  joinedServer: true,
  isOwner: true,
  isServerMuted: true,
  userServerName: true,
  isServerDeafen: true,
} as const;

export const CHANNEL_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  users: {
    select: USER_SELECT_IN_CHANNEL,
    orderBy: { nickname: 'asc' },
  },
  messages: false,
  isServerChannel: true,
  isVoice: true,
  isText: true,
  name: true,
  isGroup: true,
  callStart: true,
  isActiveCall: true,
  serverId: true,
  categoryId: true,
  usersInCall: {
    select: { ...SERVER_MEMBER_SELECT },
  },
} as const;

export const MESSAGE_SELECT = {
  id: true,
  author: { select: USER_SELECT_IN_CHANNEL },
  content: true,
  createdAt: true,
  updatedAt: true,
  repliedMessage: {
    select: {
      id: true,
      author: { select: USER_SELECT_IN_CHANNEL },
      content: true,
      createdAt: true,
      updatedAt: true,
      repliedMessage: {
        select: {
          id: true,
          author: { select: USER_SELECT_IN_CHANNEL },
          content: true,
          createdAt: true,
          updatedAt: true,

          isEdited: true,
          files: true,
        },
      },
      isEdited: true,
      files: true,
    },
  },
  isEdited: true,
  files: true,
} as const;

export const CATEGORIES_SELECT = {
  id: true,
  name: true,
  channels: { select: CHANNEL_SELECT },
} as const;

export const SERVER_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  avatar: true,
  name: true,
  users: { select: SERVER_MEMBER_SELECT },
  categories: { select: CATEGORIES_SELECT },
  connectServerLinks: true,
} as const;

export const SERVER_MINIFIED_SELECT = {
  id: true,
  avatar: true,
  name: true,
} as const;

export enum PERMISSIONS {
  VIEW_CHANNELS = 'VIEW_CHANNELS',
  EDIT_CHANNEL = 'EDIT_CHANNEL',
  EDIT_ROLES = 'EDIT_ROLES',
  EDIT_SERVER = 'EDIT_SERVER',
  CREATE_SERVER_LINK = 'CREATE_SERVER_LINK',
  EDIT_MEMBERSHIP = 'EDIT_MEMBERSHIP',
  KICK_MEMBERSHIP = 'KICK_MEMBERSHIP',
  BAN_MEMBERSHIP = 'BAN_MEMBERSHIP',
  MOVE_MEMBERSHIP = 'MOVE_MEMBERSHIP',
  MUTE_MEMBERSHIP = 'MUTE_MEMBERSHIP',
  DEAFEN_MEMBERSHIP = 'DEAFEN_MEMBERSHIP',
  ADMIN = 'ADMIN',
}
