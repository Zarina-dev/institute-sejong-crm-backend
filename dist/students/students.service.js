"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const student_entity_1 = require("./student.entity");
const bcrypt = __importStar(require("bcryptjs"));
let StudentsService = class StudentsService {
    constructor(studentRepository) {
        this.studentRepository = studentRepository;
    }
    async listStudents() {
        const students = await this.studentRepository.find({ order: { createdAt: 'DESC' } });
        return students.map((student) => ({
            ...student,
            password: student.password,
        }));
    }
    async getStudentByStudentId(studentId) {
        const student = await this.studentRepository.findOne({ where: { studentId } });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        return student;
    }
    async createStudent(input) {
        const normalizedId = input.studentId.trim();
        const normalizedPassword = input.password?.trim() || this.generatePassword(normalizedId);
        if (!normalizedId) {
            throw new common_1.BadRequestException('studentId is required');
        }
        if (await this.studentRepository.findOne({ where: { studentId: normalizedId } })) {
            throw new common_1.BadRequestException('이미 사용 중인 학생 ID입니다.');
        }
        const student = this.studentRepository.create({
            ...input,
            studentId: normalizedId,
            password: normalizedPassword,
            status: input.status ?? 'active',
            admissionDate: input.admissionDate ?? null,
            topikFiles: input.topikFiles ?? [],
        });
        const saved = await this.studentRepository.save(student);
        return {
            ...saved,
            password: normalizedPassword,
        };
    }
    async updateStudent(id, input) {
        const student = await this.studentRepository.findOne({ where: { id } });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        if (input.studentId && input.studentId.trim() !== student.studentId) {
            const existing = await this.studentRepository.findOne({ where: { studentId: input.studentId.trim() } });
            if (existing && existing.id !== id) {
                throw new common_1.BadRequestException('이미 사용 중인 학생 ID입니다.');
            }
        }
        Object.assign(student, {
            ...input,
            studentId: input.studentId?.trim() ?? student.studentId,
            password: input.password ? input.password.trim() : student.password,
            topikFiles: input.topikFiles ?? student.topikFiles,
            admissionDate: input.admissionDate ?? student.admissionDate,
        });
        const saved = await this.studentRepository.save(student);
        return {
            ...saved,
            password: saved.password,
        };
    }
    async deleteStudent(id) {
        const student = await this.studentRepository.findOne({ where: { id } });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        await this.studentRepository.remove(student);
        return { success: true };
    }
    async validateStudentLogin(studentId, password) {
        const student = await this.studentRepository.findOne({ where: { studentId } });
        if (!student) {
            return { valid: false, reason: '학생 ID 또는 비밀번호가 올바르지 않습니다.' };
        }
        if (student.status !== 'active') {
            return { valid: false, reason: '비활동 상태의 학생은 사이트에 접속할 수 없습니다.' };
        }
        const matchesPlainText = student.password === password;
        const matchesHash = student.password.startsWith('$2') && (await bcrypt.compare(password, student.password));
        if (!matchesPlainText && !matchesHash) {
            return { valid: false, reason: '학생 ID 또는 비밀번호가 올바르지 않습니다.' };
        }
        return {
            valid: true,
            student: this.sanitizeStudent(student),
        };
    }
    sanitizeStudent(student) {
        const { password, ...rest } = student;
        return rest;
    }
    generatePassword(studentId) {
        const suffix = studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '2026';
        return `inst${suffix}`;
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StudentsService);
//# sourceMappingURL=students.service.js.map