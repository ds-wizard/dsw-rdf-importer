import * as $rdf from 'rdflib'

const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')

export default class KMCrawler {
    constructor(store, importer) {
        this.store = store
        this.importer = importer
        this.km = importer._knowledgeModel
    }

    crawl() {
        this.km.chapterUuids.forEach(chapterUuid => {
            this._processChapter(chapterUuid)
        })
    }

    _processChapter(chapterUuid) {
        const chapter = this.km.entities.chapters[chapterUuid]
        if (!chapter) return;

        chapter.questionUuids.forEach(questionUuid => {
            this._processQuestion([chapterUuid], questionUuid)
        })
    }

    _processQuestion(path, questionUuid, subject) {
        const question = this.km.entities.questions[questionUuid]
        if (!question) return

        switch (question.questionType) {
            case 'ListQuestion':
                this._processListQuestion(path, question, subject)
                break
            case 'OptionsQuestion':
                this._processOptionsQuestion(path, question, subject)
                break
            case 'MultiChoiceQuestion':
                this._processMultiChoiceQuestion(path, question, subject)
                break
            case 'ValueQuestion':
                this._processValueQuestion(path, question, subject)
                break
            case 'IntegrationQuestion':
                this._processIntegrationQuestion(path, question, subject)
                break
        }
    }

    _processListQuestion(path, question, subject) {
        // Check if the list question is annotated with RDF type so that we can look for those items in RDF
        const rdfType = this._getRdfType(question.annotations)
        if (!rdfType) return

        const rdfProperty = this._getRdfProperty(question.annotations)
        const getStatements = () => {
            // if we have nested object we search them by property
            if (rdfProperty && subject) {
                return this.store.statementsMatching(subject, rdfProperty, undefined, undefined)
            }

            // for top level, we search them by type
            return this.store.statementsMatching(undefined, RDF('type'), rdfType, undefined)
        }
        
        // Find all statements about the items of matching type
        const stmts = getStatements()
        stmts.forEach(stmt => {
            // Create item and process all item template questions
            const itemUuid = this.importer.addItem([...path, question.uuid])
            question.itemTemplateQuestionUuids.forEach(itemTemplateQuesitonUuid => {
                this._processQuestion([...path, question.uuid, itemUuid], itemTemplateQuesitonUuid, stmt.subject)
            })
        })
    }

    _processOptionsQuestion(path, question, subject) {
        // Options questions are used as properties of given subject, so it is required
        if (!subject) return

        // Check if there is any RDF property set for the question
        const rdfProperty = this._getRdfProperty(question.annotations)
        if (!rdfProperty) return;

        // Find all statements matching the subject and the property
        const stmts = this.store.statementsMatching(subject, rdfProperty, undefined)
        if (stmts.length === 0) return;

        // There should only be one statement for options question
        const stmt = stmts[0]
        const answerUuid = question.answerUuids.find((answerUuid) => {
            const answer = this.km.entities.answers[answerUuid]
            if (!answer) return false

            const rdfValue = this._getRdfValue(answer.annotations)
            if (!rdfValue) return false

            return stmt.object.value === rdfValue.value
        })

        if (answerUuid) {
            this.importer.setReply([...path, question.uuid], answerUuid)
        }
    }

    _processMultiChoiceQuestion(path, question, subject) {
        // Multi-choice questions are used as properties of given subject, so it is required
        if (!subject) return

        // Check if there is any RDF property set for the question
        const rdfProperty = this._getRdfProperty(question.annotations)
        if (!rdfProperty) return

        // Find all statements matching the subject and the property
        const stmts = this.store.statementsMatching(subject, rdfProperty, undefined)
        if (stmts.length === 0) return

        // Go through all the found statements as we can have more values for multi-choice
        const choiceUuids = stmts.reduce((acc, stmt) => {
            // Go through all the choices to find if any is matching the statement
            return question.choiceUuids.reduce((acc1, choiceUuid) => {
                // Sanity check if UUIDs are messed up in KM
                const choice = this.km.entities.choices[choiceUuid]
                if (!choice) return acc1

                // Check if there is any RDF value set
                const rdfValue = this._getRdfValue(choice.annotations)
                if (!rdfValue) return acc1

                // Add choice UUID if the RDF value matches the statement value
                if (stmt.object.value === rdfValue.value) {
                    acc1.push(choice.uuid)
                }
                return acc1
            }, acc)
        }, [])

        // Set the selected choice UUIDs
        if (choiceUuids.length > 0) {
            this.importer.setReply([...path, question.uuid], choiceUuids)
        }
    }

    _processValueQuestion(path, question, subject) {
        // Check if there is any RDF property set for the question
        const rdfProperty = this._getRdfProperty(question.annotations)
        if (!rdfProperty) return

        // Find all statements matching the subject and the property
        const stmts = this.store.statementsMatching(subject, rdfProperty, undefined)
        if (stmts.length === 0) return

        // Create a reply using the value found in the statement
        this.importer.setReply([...path, question.uuid], stmts[0].object.value)
    }

    _processIntegrationQuestion(path, question, subject) {
        // Check if there is any RDF property set for the question
        const rdfProperty = this._getRdfProperty(question.annotations)
        if (!rdfProperty) return

        // Find all statements matching the subject and the property
        const stmts = this.store.statementsMatching(subject, rdfProperty, undefined)
        if (stmts.length === 0) return

        // Create a reply using the value found in the statement
        this.importer.setReply([...path, question.uuid], stmts[0].object.value)
    }

    _getRdfType(annotations) {
        return this._getRdfAnnotation('rdfType', annotations)
    }

    _getRdfProperty(annotations) {
        return this._getRdfAnnotation('rdfProperty', annotations)
    }

    _getRdfValue(annotations) {
        return this._getRdfAnnotation('rdfValue', annotations)
    }

    _getRdfAnnotation(key, annotations) {
        const annotation = annotations.find(annotation => annotation.key === key)
        if (annotation && annotation.value.length > 0) {
            return $rdf.sym(annotation.value)
        }
        return null

    }
}
