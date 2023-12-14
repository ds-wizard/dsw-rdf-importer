import dsw from '@ds-wizard/integration-sdk'
import * as $rdf from 'rdflib'

import KMCrawler from './km-crawler'


function main() {
    const importer = new dsw.Importer()

    importer
        .init()
        .then(() => {
            const fileSelector = document.getElementById('file-input')
            fileSelector.addEventListener('change', (event) => {
                const fileList = event.target.files
                if (fileList.length !== 1) {
                    alert('File not selected...')
                    return
                }
                const file = fileList[0]
                const reader = new FileReader()
                reader.addEventListener('load', (event) => {
                    const store = $rdf.graph()
                    try {
                        $rdf.parse(event.target.result, store, 'http://example.com', 'text/turtle')
                    } catch (error) {
                        console.error(error)
                        showError('Failed to parse Turtle file.')
                        return
                    }
                    try {
                        const crawler = new KMCrawler(store, importer)
                        crawler.crawl()
                    } catch (error) {
                        console.error(error)
                        showError('Failed to parse Turtle in Events.')
                        return
                    }
                    try {
                        importer.send()
                    } catch (error) {
                        console.error(error)
                        showError('Failed to send data back to the Wizard.')
                    }
                })
                reader.readAsText(file)
            })
        })
        .catch(error => {
            console.error(error)
            throw error
        })
}

function showError(message) {
    const errorDiv = document.getElementById('error')
    const errorAlert = document.getElementById('error-alert')
    errorAlert.textContent = message
    errorDiv.classList.remove('hidden')
}

window.addEventListener('load', () => {
    main()
})
