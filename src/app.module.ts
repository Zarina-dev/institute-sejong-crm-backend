import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { databaseOptions } from './database/database.options'

import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { ChronologyModule } from './chronology/chronology.module'
import { CompetitionsModule } from './competitions/competitions.module'
import { ContentModule } from './content/content.module'
import { CoursesModule } from './courses/courses.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { EventsModule } from './events/events.module'
import { GalleryModule } from './gallery/gallery.module'
import { HealthController } from './health.controller'
import { MaterialsModule } from './materials/materials.module'
import { MeetingsModule } from './meetings/meetings.module'
import { NewsModule } from './news/news.module'
import { StaffModule } from './staff/staff.module'
import { StudiesModule } from './studies/studies.module'
import { TermsModule } from './terms/terms.module'
import { TextbooksModule } from './textbooks/textbooks.module'
import { StorageModule } from './storage/storage.module'
import { TrashModule } from './trash/trash.module'
import { UploadsModule } from './uploads/uploads.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against the process working directory — run the backend
      // from backend/ (or via the root scripts, which do that for you).
      envFilePath: ['.env', '.env.local'],
    }),
    // forRootAsync: built after ConfigModule has read .env.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...databaseOptions(),
        autoLoadEntities: true,
        // Pending migrations are applied before the API starts serving.
        migrationsRun: true,
      }),
    }),
    AuthModule,
    AuditModule,
    MaterialsModule,
    CoursesModule,
    DashboardModule,
    ContentModule,
    ChronologyModule,
    CompetitionsModule,
    EventsModule,
    GalleryModule,
    NewsModule,
    MeetingsModule,
    StaffModule,
    StudiesModule,
    TermsModule,
    TextbooksModule,
    TrashModule,
    StorageModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
