const fs = require("fs");
const path = require("path");
const zlib = require("zlib"); // ZF - added support for reading a blob using custom implemented git cat-file command

const command = process.argv[2];

switch (command) {
    case "init":
        createGitDirectory();
        break;
    case 'cat-file': // ZF - added support for reading a blob using custom implemented git cat-file command
        const hash = process.argv[process.argv.length - 1];
        if (!hash) {
            throw new Error('Hash is required as an argument for cat-file command');
        }
        catFile(hash);
        break;
    default:
        throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
    try {
        const gitDir = path.join(process.cwd(), ".git");
        console.log("Current directory:", process.cwd());

        fs.mkdirSync(gitDir, { recursive: true });
        fs.mkdirSync(path.join(gitDir, "objects"), { recursive: true });
        fs.mkdirSync(path.join(gitDir, "refs"), { recursive: true });

        fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");

        console.log("Initialized git directory");

    } catch (error) {
        console.error(`Failed to create git directory: ${error.message}`);
    }
}

// ZF - added support for reading a blob using custom implemented git cat-file command
async function catFile(hash) {
    const filePath = path.join(process.cwd(), ".git", "objects", hash.slice(0, 2), hash.slice(2));
    try {
        const content = await fs.readFileSync(filePath); // Make sure this is synchronous or await if using async/await
        const dataUnzipped = zlib.inflateSync(content); // Decompress the content
        const strData = dataUnzipped.toString(); // Convert to string

        // Split the string to get content after the first null character
        const splitData = strData.split('\0');
        const res = splitData[1]; // The actual content is after the null character

        process.stdout.write(res); // Print to stdout
    } catch (error) {
        console.error(`Error reading file: ${error.message}`);
    }
}

