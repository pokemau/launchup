import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { AssessmentType } from './enums/assessment-type.enum';
import { AssessmentField } from './assessment-field.entity';
import { StartupAssessment } from './startup-assessment.entity';

@Entity({ tableName: 'assessments' })
export class Assessment {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Enum(() => AssessmentType)
  assessmentType!: AssessmentType;

  @Property()
  name!: string;

  @OneToMany(
    () => AssessmentField,
    (field) => {
      return field.assessment;
    },
  )
  fields = new Collection<AssessmentField>(this);

  @OneToMany(() => StartupAssessment, (sa) => sa.assessment)
  startupAssessments = new Collection<StartupAssessment>(this);
}
