import { Entity, PrimaryKey, ManyToOne, Property } from '@mikro-orm/core';
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

  @Property({ default: true })
  isApplicable!: boolean;
}
