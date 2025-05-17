import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './widgets/auth/auth.module';
import { FriendsModule } from './widgets/friends/friends.module';
import { MessageModule } from './widgets/message/message.module';
import { OnlineModule } from './widgets/online/online.module';
import { ServerModule } from './widgets/server/server.module';
import { UploadModule } from './widgets/upload/upload.module';
import { UserModule } from './widgets/user/user.module';
import { WssModule } from './widgets/wss/wss.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UserModule,
    UploadModule,
    FriendsModule,
    MessageModule,
    OnlineModule,
    ServerModule,
    WssModule,
  ],
})
export class AppModule {}
