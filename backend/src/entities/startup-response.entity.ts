import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Startup } from './startup.entity';
import { AssessmentField } from './assessment-field.entity';

@Entity({ tableName: 'startup_responses' })
export class StartupResponse {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @ManyToOne(() => Startup, { deleteRule: 'cascade' })
  startup!: Startup;

  @ManyToOne(() => AssessmentField, { deleteRule: 'cascade' })
  assessmentField!: AssessmentField;

  // For text answers (ShortAnswer, LongAnswer)
  @Property({ nullable: true, type: 'text' })
  answerValue?: string;

  // For file uploads
  @Property({ nullable: true })
  fileUrl?: string;

  @Property({ nullable: true })
  fileName?: string;
}
