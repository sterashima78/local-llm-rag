import * as pagefind from 'pagefind';

async function createIndex() {
    const { index } = await pagefind.createIndex();

    // Index all HTML files in a directory
    await index.addDirectory({
        path: "public/documents"
    });

    // Or, write the index to disk
    await index.writeFiles({
        outputPath: "public/pagefind"
    });
}

await createIndex();
