import { Entity, PrimaryKey, ManyToOne, Enum } from '@mikro-orm/core';
import { AssessmentStatus } from './enums/assessment-util.enum';
import { Startup } from './startup.entity';
import { Assessment } from './assessment.entity';

@Entity({ tableName: 'startup_assessments' })
export class StartupAssessment {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @ManyToOne(() => Startup, { deleteRule: 'cascade' })
  startup!: Startup;

  @ManyToOne(() => Assessment, { deleteRule: 'cascade' })
  assessment!: Assessment;

  @Enum(() => AssessmentStatus)
  status!: AssessmentStatus; // Pending or Completed

  // @Property({ onCreate: () => new Date() })
  // assignedAt = new Date();

  // @Property({ nullable: true })
  // completedAt?: Date;
}
