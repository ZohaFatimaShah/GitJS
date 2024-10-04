const fs = require("fs");
const path = require("path");
const zlib = require("zlib"); // ZF - added support for reading a blob using custom implemented git cat-file command
const crypto = require("crypto"); // ZF - Added functionality to read a file's content, prepend the Git blob header, and compute the SHA-1 hash.

const command = process.argv[2];
const option = process.argv[3];
const fileName = process.argv[4];
const hash = process.argv[5];

// Check for init command format
if (command === "init" && (option || fileName || hash)) {
    throw new Error("Usage: node main.js init");
}

// Check for cat-file command format
if (command === "cat-file" && !hash) {
    throw new Error("Usage: node main.js cat-file <hash>");
}

// Check for hash-object command format
if (command === "hash-object" && (option !== "-w" || !fileName)) {
    throw new Error("Usage: node main.js hash-object -w <filename>");
}

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
    case 'hash-object': // ZF - Added functionality to read a file's content, prepend the Git blob header, and compute the SHA-1 hash.
        const fileName = process.argv[process.argv.length - 1];
        if (!fileName) {
            throw new Error('File name is required as an argument for hash-object command');
        }
        hashObject(fileName);
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

// ZF - Added functionality to read a file's content, prepend the Git blob header, and compute the SHA-1 hash.
function hashObject(fileName) {
    try {
        // Read file content
        const fileContent = fs.readFileSync(fileName);
        
        // Create header with 'blob {size}\0' format
        const header = `blob ${fileContent.length}\0`;
        
        // Combine header and file content
        const store = header + fileContent;
        
        // Compute SHA-1 hash
        const hash = crypto.createHash('sha1').update(store).digest('hex');
        
        // Create the object path (first 2 chars for folder, rest for file name)
        const objectDir = path.join(process.cwd(), ".git", "objects", hash.slice(0, 2));
        const objectPath = path.join(objectDir, hash.slice(2));

        // Create the folder if it doesn't exist
        fs.mkdirSync(objectDir, { recursive: true });

        // Compress the content using zlib
        const compressedContent = zlib.deflateSync(store);

        // Write the compressed object to the file system
        fs.writeFileSync(objectPath, compressedContent);

        console.log(`File successfully hashed. SHA-1: ${hash}`);

    } catch (error) {
        console.error(`Failed to hash object: ${error.message}`);
    }
}

