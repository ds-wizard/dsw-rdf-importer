import dsw from '@ds-wizard/integration-sdk'


function main() {
    const importer = new dsw.Importer()

    importer
        .init()
        .then(() => {
            alert('importer initialized')
        })
        .catch(error => {
            console.error(error)
            throw error
        })
}

window.addEventListener('load', () => {
    main()
})
