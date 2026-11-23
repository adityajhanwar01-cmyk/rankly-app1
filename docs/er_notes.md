# Entity Relationship Notes

## Entities & Relationships
- **STUDENT** 1:1 **STUDENT_PROFILE**
- **STUDENT** 1:N **STUDENT_PREFERENCE**
- **STUDENT** 1:N **FAMILY_PREFERENCE**
- **STUDENT** 1:N **SEARCH_SESSION**
- **STUDENT** 1:N **STUDENT_SHORTLIST**
- **SEARCH_SESSION** 1:N **RECOMMENDATION_RESULT**
- **RECOMMENDATION_RESULT** 1:N **RECOMMENDATION_DETAIL**
- **IIT_COLLEGE** 1:1 **COLLEGE_INFO**
- **IIT_COLLEGE** M:N **BRANCH** (Resolved through **HISTORICAL_CUTOFF**)
- **PREFERENCE_CRITERION** 1:1 **EVALUATION_FACTOR**
- **IIT_COLLEGE** 1:N **BRANCH_TREND_ANALYTICS**
- **IIT_COLLEGE** 1:N **PEER_CHOICE_TREND**

## ER Diagram Description
The diagram models a student-centric platform. The core actor, `STUDENT`, maintains a 1:1 relationship with `STUDENT_PROFILE` and creates many `SEARCH_SESSION`s. Each session evaluates `STUDENT_PREFERENCE`s to yield multiple `RECOMMENDATION_RESULT`s. The core institutional data is stored in `IIT_COLLEGE` and `BRANCH`, interacting via the M:N resolution table `HISTORICAL_CUTOFF`. Advanced analytics map 1:N from colleges into `BRANCH_TREND_ANALYTICS` and `PEER_CHOICE_TREND`.
