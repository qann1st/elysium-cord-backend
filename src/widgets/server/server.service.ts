import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CATEGORIES_SELECT,
  CHANNEL_SELECT,
  PERMISSIONS,
  ROLE_SELECT,
  SERVER_MEMBER_SELECT,
  SERVER_MINIFIED_SELECT,
  SERVER_SELECT,
} from 'src/shared/constants';
import { hasPermission } from 'src/shared/helpers/hasPermission';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { EditChannelDto, NewChannelDto } from '../channel/dto/new-channel.dto';
import { UserDto } from '../user/dto/user.dto';
import { CreateServerDto } from './dto/create-server.dto';
import { EditMembershipDto } from './dto/membership.dto';
import { EditCategoryDto, NewCategoryDto } from './dto/new-category.dto';
import { EditRoleDto, NewRoleDto, SwapRolesDto } from './dto/role.dto';
import { ServerGateway } from './server.gateway';
import { EditServerDto } from './dto/edit-server.dto';

@Injectable()
export class ServerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverGateway: ServerGateway,
  ) {}

  async getServers(user: UserDto, page: number, limit: number) {
    if (!page || !limit) {
      throw new BadRequestException('Page or limit are required');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const servers = await this.prisma.server.findMany({
      where: { users: { some: { user: { id: user.id } } } },
      skip,
      take,
      select: {
        id: true,
        name: true,
        avatar: true,
        categories: {
          select: {
            channels: { select: { id: true, categoryId: true }, take: 1 },
          },
        },
        users: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.server.count({
      where: {
        id: user.id,
      },
    });

    return {
      servers: await Promise.all(
        servers.map(async (server) => {
          const firstCategory = server.categories.find(
            (category) => category.channels.length > 0,
          );
          const firstChannelServerWithUsers =
            await this.prisma.channel.findFirst({
              where: { serverId: server.id, usersInCall: { some: {} } },
              select: { usersInCall: { select: SERVER_MEMBER_SELECT } },
            });
          if (!firstCategory)
            return { id: server.id, name: server.name, avatar: server.avatar };
          return {
            id: server.id,
            name: server.name,
            avatar: server.avatar,
            categoryId: firstCategory.channels[0].categoryId,
            channelId: firstCategory.channels[0].id,
            firstUsersInChannels: firstChannelServerWithUsers
              ? firstChannelServerWithUsers.usersInCall.slice(0, 5)
              : null,
            totalUsersInChannels:
              firstChannelServerWithUsers?.usersInCall.length,
          };
        }),
      ),
      total,
    };
  }

  async getServer(user: UserDto, serverId: number) {
    if (Number.isNaN(serverId)) {
      throw new BadRequestException('Invalid server id');
    }

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: SERVER_SELECT,
    });

    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    delete server.users;

    return { ...server };
  }

  async getMembershipUserServer(user: UserDto, serverId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    return membership;
  }

  async getServerUsers(serverId: number, page: number, limit: number) {
    if (Number.isNaN(serverId)) {
      throw new BadRequestException('Invalid server id');
    }

    if (!page || !limit) {
      throw new BadRequestException('Page or limit are required');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        users: {
          skip,
          take,
          select: SERVER_MEMBER_SELECT,
        },
      },
    });

    const total = await this.prisma.server.count({
      where: {
        id: serverId,
        users: {
          some: {},
        },
      },
    });

    return {
      online: server.users.filter((user) => user.user.isOnline),
      offline: server.users.filter((user) => !user.user.isOnline),
      total,
    };
  }

  async createServer(user: UserDto, server: CreateServerDto) {
    const newServer = await this.prisma.server.create({
      data: {
        ...server,
      },
      select: SERVER_SELECT,
    });

    const role = await this.prisma.role.create({
      data: {
        name: 'everyone',
        Server: { connect: { id: newServer.id } },
        isDefault: true,
        order: 0,
      },
    });

    const membership = await this.prisma.serverMembership.create({
      data: {
        user: { connect: { id: user.id } },
        server: { connect: { id: newServer.id } },
        roles: { connect: { id: role.id } },
        isOwner: true,
      },
    });

    const textChannel = await this.prisma.channel.create({
      data: {
        isText: true,
        isServerChannel: true,
        name: 'общий-чат',
        serverId: newServer.id,
      },
    });

    const voiceCategory = await this.prisma.category.create({
      data: {
        channels: { connect: { id: textChannel.id } },
        server: { connect: { id: newServer.id } },
        name: 'Текстовые каналы',
      },
    });

    const voiceChannel = await this.prisma.channel.create({
      data: {
        isVoice: true,
        isServerChannel: true,
        name: 'Голосовой канал',
        serverId: newServer.id,
      },
    });

    const textCategory = await this.prisma.category.create({
      data: {
        server: { connect: { id: newServer.id } },
        channels: { connect: { id: voiceChannel.id } },
        name: 'Голосовые каналы',
      },
    });

    const returnServer = await this.prisma.server.update({
      where: { id: newServer.id },
      data: {
        categories: {
          connect: [{ id: textCategory.id }, { id: voiceCategory.id }],
        },
        roles: {
          connect: { id: role.id },
        },
        users: { connect: { id: membership.id } },
      },
      select: { id: true, name: true, avatar: true },
    });

    const serverCheck = await this.prisma.server.findUnique({
      where: { id: returnServer.id },
      select: SERVER_SELECT,
    });

    return {
      ...returnServer,
      categoryId: serverCheck.categories[0].channels[0].categoryId,
      channelId: serverCheck.categories[0].channels[0].id,
    };
  }

  async createServerLink(user: UserDto, serverId: number) {
    const uuid = uuidv4();

    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.CREATE_SERVER_LINK) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to create server link');
    }

    await this.prisma.server.update({
      where: { id: serverId },
      data: { connectServerLinks: { push: uuid } },
      select: SERVER_SELECT,
    });

    return uuid;
  }

  async joinServer(user: UserDto, code: string) {
    const server = await this.prisma.server.findFirst({
      where: { connectServerLinks: { has: code } },
      select: SERVER_SELECT,
    });

    const bannedOnServer = await this.prisma.server.findFirst({
      where: { bannedUsers: { some: { id: user.id } } },
    });

    if (bannedOnServer) {
      throw new ForbiddenException('You are banned from this server');
    }

    const role = await this.prisma.role.findFirst({
      where: { isDefault: true },
    });

    const membership = await this.prisma.serverMembership.create({
      data: {
        user: { connect: { id: user.id } },
        server: { connect: { id: server.id } },
        roles: { connect: { id: role.id } },
      },
      select: SERVER_MEMBER_SELECT,
    });

    if (!server) {
      throw new BadRequestException('Server not found');
    }

    const updatedServer = await this.prisma.server.update({
      where: { id: server.id },
      data: { users: { connect: { id: membership.id } } },
      select: { id: true, name: true, avatar: true },
    });

    this.serverGateway.broadcastToServer(server.id, 'userJoinedToServer', {
      membership,
    });

    return {
      ...updatedServer,
      categoryId: server.categories[0].channels[0].categoryId,
      channelId: server.categories[0].channels[0].id,
    };
  }

  async getRoles(user: UserDto, serverId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_ROLES) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit roles');
    }

    return this.prisma.role.findMany({
      where: {
        Server: { id: serverId },
      },
      select: ROLE_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async createRole(user: UserDto, serverId: number, data: NewRoleDto) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_ROLES) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit roles');
    }

    return this.prisma.role.create({
      data: { ...data, Server: { connect: { id: serverId } } },
      select: ROLE_SELECT,
    });
  }

  async editRole(
    user: UserDto,
    serverId: number,
    roleId: number,
    data: EditRoleDto,
  ) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_ROLES) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit roles');
    }

    const role = await this.prisma.role.findFirst({
      where: { id: roleId },
    });

    const userHighestRole = await this.prisma.role.findFirst({
      where: {
        Server: { id: serverId },
        memberships: { some: { userId: user.id } },
      },
      orderBy: { order: 'asc' },
      select: { order: true },
    });

    if (role.order <= userHighestRole.order && !membership.isOwner) {
      throw new ForbiddenException(
        'You are not allowed to edit this role because it is higher than your highest role',
      );
    }

    this.serverGateway.broadcastToServer(serverId, 'editRole', { role });

    return this.prisma.role.update({
      data: {
        name: data.name ? data.name : role.name,
        color: data.color ? data.color : role.color,
        permissions: {
          set: data.permissions ? data.permissions : role.permissions,
        },
      },
      where: {
        id: roleId,
      },
      select: ROLE_SELECT,
    });
  }

  async swapRoles(user: UserDto, serverId: number, data: SwapRolesDto) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_ROLES) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit roles');
    }

    const userHighestRole = await this.prisma.role.findFirst({
      where: {
        Server: { id: serverId },
        memberships: { some: { userId: user.id } },
      },
      orderBy: { order: 'asc' },
      select: { order: true },
    });

    await Promise.all([
      data.roles.map(async (roleArr) => {
        const role = await this.prisma.role.findFirst({
          where: { id: roleArr.id },
        });

        if (role.order <= userHighestRole.order && !membership.isOwner) {
          throw new ForbiddenException(
            'You are not allowed to edit this role because it is higher than your highest role',
          );
        }

        return await this.prisma.role.update({
          data: {
            order: roleArr.order,
          },
          where: {
            id: roleArr.id,
          },
          select: ROLE_SELECT,
        });
      }),
    ]);
  }

  async deleteRole(user: UserDto, serverId: number, roleId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_ROLES) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit roles');
    }

    const role = await this.prisma.role.findFirst({
      where: { id: roleId },
      select: { order: true, isDefault: true },
    });

    const userHighestRole = await this.prisma.role.findFirst({
      where: {
        Server: { id: serverId },
        memberships: { some: { user: { id: user.id } } },
      },
      orderBy: { order: 'asc' },
      select: { order: true },
    });

    if (
      role.order <= userHighestRole.order &&
      !membership.isOwner &&
      !role.isDefault
    ) {
      throw new ForbiddenException(
        'You are not allowed to edit this role because it is higher than your highest role',
      );
    }

    await this.prisma.role.delete({
      where: {
        id: roleId,
      },
      select: ROLE_SELECT,
    });

    return { roleId };
  }

  async deleteServer(user: UserDto, serverId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (!membership.isOwner) {
      throw new ForbiddenException('You are not a owner of this server');
    }

    this.serverGateway.broadcastToServer(serverId, 'deletedServer', {
      serverId,
    });

    await this.prisma.server.delete({
      where: { id: serverId },
      select: SERVER_MINIFIED_SELECT,
    });

    return { serverId };
  }

  async leaveServer(user: UserDto, serverId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this server');
    }

    if (membership.isOwner) {
      throw new ForbiddenException('You are the owner of this server');
    }

    this.serverGateway.broadcastToServer(serverId, 'userLeavedFromServer', {
      membershipId: membership.id,
    });

    await this.prisma.serverMembership.delete({
      where: { id: membership.id },
    });

    return true;
  }

  async createChannel(
    user: UserDto,
    serverId: number,
    categoryId: number,
    data: NewChannelDto,
  ) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_CHANNEL) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to create channels');
    }

    const channel = await this.prisma.channel.create({
      data: {
        name: data.name,
        isVoice: data.type === 'voice',
        isText: data.type === 'text',
        category: { connect: { id: categoryId } },
        isServerChannel: true,
        serverId,
      },
      select: CHANNEL_SELECT,
    });

    this.serverGateway.broadcastToServer(serverId, 'createdChannel', {
      channel,
    });

    return channel;
  }

  async editServer(user: UserDto, serverId: number, data: EditServerDto) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_SERVER) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit server');
    }

    const server = await this.prisma.server.update({
      where: { id: serverId },
      data,
      select: SERVER_MINIFIED_SELECT,
    });

    this.serverGateway.broadcastToBackgroundServer(serverId, 'editedServer', {
      server,
    });

    return server;
  }

  async editChannel(
    user: UserDto,
    serverId: number,
    channelId: number,
    data: EditChannelDto,
  ) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_CHANNEL) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit channels');
    }

    const channel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        name: data.name,
      },
      select: CHANNEL_SELECT,
    });

    this.serverGateway.broadcastToServer(serverId, 'editedChannel', {
      channel,
    });

    return channel;
  }

  async createCategory(user: UserDto, serverId: number, data: NewCategoryDto) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_CHANNEL) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to create categories');
    }

    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        server: { connect: { id: serverId } },
      },
      select: CATEGORIES_SELECT,
    });

    this.serverGateway.broadcastToServer(serverId, 'createdCategory', {
      category,
    });

    return category;
  }

  async editCategory(
    user: UserDto,
    serverId: number,
    categoryId,
    data: EditCategoryDto,
  ) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_CHANNEL) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to edit categories');
    }

    const category = await this.prisma.category.update({
      data: {
        name: data.name,
        server: { connect: { id: serverId } },
      },
      where: { id: categoryId },
      select: CATEGORIES_SELECT,
    });

    this.serverGateway.broadcastToServer(serverId, 'editedCategory', {
      category,
    });

    return category;
  }

  async deleteChannel(user: UserDto, serverId: number, channelId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_CHANNEL) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to delete channels');
    }

    const channelExists = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channelExists) {
      throw new NotFoundException(
        `Channel with ID ${channelId} does not exist`,
      );
    }

    const channel = await this.prisma.channel.delete({
      where: { id: channelId },
      select: CHANNEL_SELECT,
    });

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: SERVER_SELECT,
    });

    const firstCategory = server.categories.find(
      (category) => category.channels.length > 0,
    );

    this.serverGateway.broadcastToServer(serverId, 'deletedChannel', {
      channelId,
      categoryId: channel.categoryId,
      serverCategoryId: firstCategory?.channels[0].categoryId,
      serverChannelId: firstCategory?.channels[0].id,
    });

    return {
      channelId,
      categoryId: channel.categoryId,
      serverCategoryId: firstCategory?.channels[0].categoryId,
      serverChannelId: firstCategory?.channels[0].id,
    };
  }

  async deleteCategory(user: UserDto, serverId: number, categoryId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_CHANNEL) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to delete channels');
    }

    this.serverGateway.broadcastToServer(serverId, 'deletedCategory', {
      categoryId,
    });

    await this.prisma.category.delete({ where: { id: categoryId } });

    return { categoryId };
  }

  async editMembership(
    user: UserDto,
    serverId: number,
    membershipId: number,
    data: EditMembershipDto,
  ) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.EDIT_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException(
        'You are not allowed to edit this membership',
      );
    }

    const checkRole = await this.prisma.role.findFirst({
      where: { id: data.addRoleId || data.removeRoleId },
    });

    if (checkRole.isDefault && (data.addRoleId || data.removeRoleId)) {
      throw new ForbiddenException('You cannot edit default roles');
    }

    const userHighestRole = await this.prisma.role.findFirst({
      where: {
        Server: { id: serverId },
        memberships: { some: { user: { id: user.id } } },
      },
      orderBy: { order: 'asc' },
      select: { order: true },
    });

    if (
      checkRole.order <= userHighestRole.order &&
      !membership.isOwner &&
      (data.isServerDeafen == null || data.isServerMuted == null)
    ) {
      throw new ForbiddenException(
        'You are not allowed to edit this role because it is higher than your highest role',
      );
    }

    const editedMembership = await this.prisma.serverMembership.update({
      where: { id: membershipId },
      data:
        data.addRoleId || data.removeRoleId
          ? {
              roles: data.addRoleId
                ? { connect: { id: data.addRoleId } }
                : { disconnect: { id: data.removeRoleId } },
            }
          : data,
      select: SERVER_MEMBER_SELECT,
    });

    this.serverGateway.broadcastToServer(serverId, 'editedMembership', {
      membership: editedMembership,
    });

    return editedMembership;
  }

  async kickMembership(user: UserDto, serverId: number, membershipId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.KICK_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to kick users');
    }

    const checkMembership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: membershipId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (checkMembership.isOwner) {
      throw new ForbiddenException('You cannot kick the owner');
    }

    if (checkMembership.id === membershipId) {
      throw new ForbiddenException('You cannot kick yourself');
    }

    const updatedMembership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: membershipId } },
      select: SERVER_MEMBER_SELECT,
    });

    await this.prisma.serverMembership.delete({
      where: { id: updatedMembership.id },
    });

    this.serverGateway.broadcastToServer(serverId, 'userLeavedFromServer', {
      membershipId: updatedMembership.id,
    });

    await this.serverGateway.broadcastToUser(
      updatedMembership.user.id,
      'userLeavedFromServer',
      {
        membershipId: updatedMembership.id,
      },
    );

    return updatedMembership;
  }

  async moveMembership(
    user: UserDto,
    serverId: number,
    moveChannelId: number,
    membershipId: number,
  ) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.MOVE_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to kick users');
    }

    const moveMembership = await this.prisma.serverMembership.findFirst({
      where: { id: membershipId },
      select: SERVER_MEMBER_SELECT,
    });

    if (!moveMembership.channel) {
      throw new ForbiddenException('User not in channel on this server ');
    }

    const disconnectChannel = await this.prisma.channel.update({
      where: { id: moveMembership.channel.id },
      select: {
        id: true,
        categoryId: true,
        isVoice: true,
        isServerChannel: true,
        serverId: true,
        usersInCall: true,
        name: true,
      },
      data: {
        usersInCall: {
          disconnect: {
            id: moveMembership.id,
          },
        },
      },
    });

    const channel = await this.prisma.channel.update({
      where: { id: moveChannelId },
      select: {
        id: true,
        categoryId: true,
        isVoice: true,
        isServerChannel: true,
        serverId: true,
        usersInCall: true,
        name: true,
      },
      data: {
        usersInCall: {
          connect: {
            id: moveMembership.id,
          },
        },
      },
    });

    this.serverGateway.broadcastToServer(channel.serverId, 'leavedChannel', {
      channel: {
        id: disconnectChannel.id,
        categoryId: disconnectChannel.categoryId,
        name: disconnectChannel.name,
      },
      membership: {
        ...moveMembership,
        channel: { id: disconnectChannel.id, name: disconnectChannel.name },
      },
    });

    this.serverGateway.broadcastToServer(channel.serverId, 'joinedChannel', {
      channel: {
        id: channel.id,
        categoryId: channel.categoryId,
        name: channel.name,
      },
      membership: {
        ...moveMembership,
        channel: {
          id: channel.id,
          name: channel.name,
        },
      },
    });

    const firstChannelServerWithUsers = await this.prisma.channel.findFirst({
      where: { serverId: channel.serverId, usersInCall: { some: {} } },
      select: { usersInCall: { select: SERVER_MEMBER_SELECT } },
    });

    this.serverGateway.broadcastToBackgroundServer(
      channel.serverId,
      'firstUsersInChannel',
      {
        serverId: channel.serverId,
        firstUsersInChannels: firstChannelServerWithUsers?.usersInCall.slice(
          0,
          5,
        ),
        totalUsersInChannels: firstChannelServerWithUsers?.usersInCall.length,
      },
    );

    await this.serverGateway.broadcastToUser(
      moveMembership.user.id,
      'movedMembership',
      {
        channel: {
          id: channel.id,
          categoryId: channel.categoryId,
        },
        serverId: channel.serverId,
      },
    );

    return true;
  }

  async banMembership(user: UserDto, serverId: number, membershipId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.BAN_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to create channels');
    }

    const checkMembership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: membershipId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (checkMembership.isOwner) {
      throw new ForbiddenException('You cannot ban the owner');
    }

    if (checkMembership.id === membershipId) {
      throw new ForbiddenException('You cannot ban yourself');
    }

    const updatedMembership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: membershipId } },
      select: SERVER_MEMBER_SELECT,
    });

    await this.prisma.serverMembership.delete({
      where: { id: updatedMembership.id },
    });

    await this.prisma.server.update({
      where: { id: serverId },
      data: {
        bannedUsers: { connect: { id: updatedMembership.user.id } },
      },
    });

    this.serverGateway.broadcastToServer(serverId, 'userLeavedFromServer', {
      membershipId: updatedMembership.id,
    });

    await this.serverGateway.broadcastToUser(
      updatedMembership.user.id,
      'userLeavedFromServer',
      {
        membershipId: updatedMembership.id,
      },
    );

    return updatedMembership;
  }

  async unbanMembership(user: UserDto, serverId: number, userId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.BAN_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to unban channels');
    }

    await this.prisma.server.update({
      where: { id: serverId },
      data: {
        bannedUsers: { disconnect: { id: userId } },
      },
    });

    return true;
  }

  async kickFromChannel(user: UserDto, serverId: number, userId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.MOVE_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to kick users');
    }

    const kickMembership = await this.prisma.serverMembership.findFirst({
      where: { id: userId },
      select: SERVER_MEMBER_SELECT,
    });

    const channel = await this.prisma.channel.update({
      where: { id: kickMembership.channel.id },
      select: {
        id: true,
        categoryId: true,
        isVoice: true,
        isServerChannel: true,
        serverId: true,
        usersInCall: true,
      },
      data: {
        usersInCall: {
          disconnect: {
            id: kickMembership.id,
          },
        },
      },
    });

    this.serverGateway.broadcastToServer(channel.serverId, 'leavedChannel', {
      channel: {
        id: channel.id,
        categoryId: channel.categoryId,
      },
      membership: kickMembership,
      kick: true,
    });

    return true;
  }

  async getBannedUsers(user: UserDto, serverId: number) {
    const membership = await this.prisma.serverMembership.findFirst({
      where: { user: { id: user.id }, server: { id: serverId } },
      select: SERVER_MEMBER_SELECT,
    });

    if (
      !membership.isOwner &&
      !hasPermission(membership, PERMISSIONS.BAN_MEMBERSHIP) &&
      !hasPermission(membership, PERMISSIONS.ADMIN)
    ) {
      throw new ForbiddenException('You are not allowed to unban channels');
    }

    return this.prisma.server.findFirst({
      where: { id: serverId },
      select: { bannedUsers: true },
    });
  }
}
