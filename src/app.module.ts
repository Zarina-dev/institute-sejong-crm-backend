import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CoursesModule } from './courses/courses.module'
import { HealthController } from './health.controller'
import { MaterialsModule } from './materials/materials.module'
import { NewsModule } from './news/news.module'
import { StaffModule } from './staff/staff.module'
import { StudentsModule } from './students/students.module'
import { UploadsModule } from './uploads/uploads.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against the process working directory — run the backend
      // from backend/ (or via the root scripts, which do that for you).
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'institut',
      // Development convenience: the schema is created/altered from the
      // entities on boot. Replace with migrations before production — it
      // can drop columns and it has no rollback.
      synchronize: true,
      autoLoadEntities: true,
      logging: ['error'],
    }),
    MaterialsModule,
    StudentsModule,
    CoursesModule,
    NewsModule,
    StaffModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
