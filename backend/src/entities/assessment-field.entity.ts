import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { AssessmentAnswerType } from './enums/assessment-util.enum';
import { Assessment } from './assessment.entity';
import { StartupResponse } from './startup-response.entity';

@Entity({ tableName: 'assessment_fields' })
export class AssessmentField {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @ManyToOne(() => Assessment, { deleteRule: 'cascade' })
  assessment!: Assessment;

  @Property({ type: 'text' })
  description!: string;

  @Enum(() => AssessmentAnswerType)
  answerType!: AssessmentAnswerType;

  @OneToMany(
    () => StartupResponse,
    (r) => {
      return r.assessmentField;
    },
  )
  responses = new Collection<StartupResponse>(this);
}
