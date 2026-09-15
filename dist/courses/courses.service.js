"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const course_entity_1 = require("./course.entity");
const course_application_entity_1 = require("./course-application.entity");
const enrollment_entity_1 = require("./enrollment.entity");
const student_entity_1 = require("../students/student.entity");
let CoursesService = class CoursesService {
    constructor(courseRepository, applicationRepository, enrollmentRepository, studentRepository) {
        this.courseRepository = courseRepository;
        this.applicationRepository = applicationRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
    }
    async listCourses({ publishedOnly = false } = {}) {
        const query = this.courseRepository.createQueryBuilder('course');
        if (publishedOnly) {
            query.where('course.isPublished = :isPublished', { isPublished: true });
        }
        const courses = await query.orderBy('course.createdAt', 'DESC').getMany();
        return courses;
    }
    async getCourseById(id) {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        return course;
    }
    async createCourse(input) {
        if (!input.title || !input.subject) {
            throw new common_1.BadRequestException('필수 입력값이 누락되었습니다.');
        }
        const course = this.courseRepository.create({
            ...input,
            level: input.level ?? null,
            capacity: Number(input.capacity ?? 0),
            isPublished: input.isPublished ?? false,
        });
        return this.courseRepository.save(course);
    }
    async updateCourse(id, input) {
        const course = await this.getCourseById(id);
        Object.assign(course, {
            ...input,
            capacity: input.capacity !== undefined ? Number(input.capacity) : course.capacity,
        });
        return this.courseRepository.save(course);
    }
    async deleteCourse(id) {
        const course = await this.getCourseById(id);
        await this.courseRepository.remove(course);
        return { success: true };
    }
    async publishCourse(id) {
        const course = await this.getCourseById(id);
        course.isPublished = true;
        return this.courseRepository.save(course);
    }
    async unpublishCourse(id) {
        const course = await this.getCourseById(id);
        course.isPublished = false;
        return this.courseRepository.save(course);
    }
    async listApplications() {
        const applications = await this.applicationRepository.find({
            order: { createdAt: 'DESC' },
            relations: ['course', 'student'],
        });
        const normalized = await Promise.all(applications.map(async (application) => ({
            ...application,
            course: application.course ?? (await this.getCourseById(application.courseId)),
            student: application.student,
        })));
        return normalized;
    }
    async getApplicationById(id) {
        const application = await this.applicationRepository.findOne({
            where: { id },
            relations: ['course', 'student'],
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        return {
            ...application,
            course: application.course ?? (await this.getCourseById(application.courseId)),
            student: application.student,
        };
    }
    async createApplication(input) {
        if (!input.courseId || !input.applicantName || !input.applicantEmail) {
            throw new common_1.BadRequestException('수강 신청에 필요한 정보가 누락되었습니다.');
        }
        const course = await this.getCourseById(input.courseId);
        if (!course.isPublished) {
            throw new common_1.BadRequestException('현재 공개 중인 과정만 신청할 수 있습니다.');
        }
        const application = this.applicationRepository.create({
            ...input,
            status: 'pending',
            courseId: input.courseId,
            studentId: input.studentId ?? null,
            documents: input.documents ?? [],
        });
        return this.applicationRepository.save(application);
    }
    async updateApplicationStatus(id, status) {
        const application = await this.getApplicationById(id);
        application.status = status;
        const course = application.course ?? (await this.getCourseById(application.courseId));
        if (status === 'approved' || status === 'enrolled') {
            const studentRecord = application.studentId
                ? await this.studentRepository.findOne({ where: { id: application.studentId } })
                : null;
            if (studentRecord) {
                studentRecord.course = course.title;
                await this.studentRepository.save(studentRecord);
            }
            if (application.studentId && application.courseId) {
                const existingEnrollment = await this.enrollmentRepository.findOne({
                    where: { studentId: application.studentId, courseId: application.courseId },
                });
                if (!existingEnrollment) {
                    await this.createEnrollment(application.studentId, application.courseId);
                }
            }
        }
        return this.applicationRepository.save(application);
    }
    async rejectApplication(id) {
        return this.updateApplicationStatus(id, 'rejected');
    }
    async approveApplication(id) {
        return this.updateApplicationStatus(id, 'approved');
    }
    async listEnrollments() {
        return this.enrollmentRepository.find({
            order: { createdAt: 'DESC' },
            relations: ['course', 'student'],
        });
    }
    async createEnrollment(studentId, courseId) {
        const student = await this.studentRepository.findOne({ where: { id: studentId } });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        const course = await this.getCourseById(courseId);
        const existing = await this.enrollmentRepository.findOne({ where: { studentId, courseId } });
        if (existing) {
            throw new common_1.BadRequestException('이미 등록된 과정입니다.');
        }
        const enrollment = this.enrollmentRepository.create({
            courseId,
            studentId,
            status: 'active',
        });
        await this.enrollmentRepository.save(enrollment);
        student.course = course.title;
        await this.studentRepository.save(student);
        return enrollment;
    }
    async listStudentEnrollments(studentId) {
        const looksLikeUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(studentId);
        const student = looksLikeUuid
            ? await this.studentRepository.findOne({ where: { id: studentId } })
            : await this.studentRepository.findOne({ where: { studentId } });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        return this.enrollmentRepository.find({
            where: { studentId: student.id },
            relations: ['course'],
            order: { createdAt: 'DESC' },
        });
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(course_entity_1.Course)),
    __param(1, (0, typeorm_1.InjectRepository)(course_application_entity_1.CourseApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __param(3, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CoursesService);
//# sourceMappingURL=courses.service.js.map