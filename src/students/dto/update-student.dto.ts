import { PartialType } from '@nestjs/mapped-types'
import { IsString, MaxLength, MinLength } from 'class-validator'

import { CreateStudentDto } from './create-student.dto'

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class StudentLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  studentId!: string

  @IsString()
  @MaxLength(255)
  password!: string
}
