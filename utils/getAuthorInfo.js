// Utility to decode author.info
const fs = require('fs');

function getAuthorInfo() {
    try {
        const data = fs.readFileSync(__dirname + '/../author.info', 'utf8');
        const decoded = Buffer.from(data, 'base64').toString('utf8');
        return JSON.parse(decoded);
    } catch (e) {
        // Fallback hardcoded info if file is missing or corrupted
        return {
            author: 'dnz_zz',
            discord: '923205829166006272',
            website: 'https://github.com/dnx01/Mr.Manager'
        };
    }
}

module.exports = getAuthorInfo;
