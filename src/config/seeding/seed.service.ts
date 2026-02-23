import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { RoleTier } from 'src/common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        await this.seedAdminUser();
    }

    async seedAdminUser() {
        const adminEmail = 'admin@auditoria.com';

        const existingAdmin = await this.userRepository.findOne({
            where: { email: adminEmail },
        });

        if (existingAdmin) {
            this.logger.log(`⚠️  Admin user already exists (${adminEmail}), skipping seed.`);
            return;
        }

        const hashedPassword = bcrypt.hashSync('admin123', 10);

        const admin = this.userRepository.create({
            username: 'Admin',
            email: adminEmail,
            password: hashedPassword,
            roleTier: RoleTier.Admin,
        });

        await this.userRepository.save(admin);

        this.logger.log('✅ Admin user seeded successfully!');
        this.logger.log(`📧 Email: ${adminEmail}`);
        this.logger.log('🔑 Password: admin123');
    }
}
