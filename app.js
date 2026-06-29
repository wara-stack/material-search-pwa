let db;

async function loadDatabase() {

    const fileInput = document.getElementById("dbFile");

    if (!fileInput.files.length) {
        alert("Please select a database file.");
        return;
    }

    const file = fileInput.files[0];

    document.getElementById("status").innerHTML =
        "Loading Database...";

    try {

        const SQL = await initSqlJs({
            locateFile: file => file
        });

        const buffer = await file.arrayBuffer();

        console.time("DB Load");

        db = new SQL.Database(
            new Uint8Array(buffer)
        );

        console.timeEnd("DB Load");

        document.getElementById("status").innerHTML =
            "✅ Database Loaded";

    } catch (err) {

        console.error(err);

        document.getElementById("status").innerHTML =
            "❌ Database Load Failed";

        alert("Failed to load database.");
    }
}


function searchMaterial() {

    if (!db) {
        alert("Load database first.");
        return;
    }

    const searchText =
        document.getElementById("searchText")
        .value
        .trim();

    if (searchText === "") {
        return;
    }

    try {

        const stmt = db.prepare(`
            SELECT
                code,
                short_desc,
                long_desc,
                status
            FROM materials
            WHERE
                code LIKE ?
                OR short_desc LIKE ?
                OR long_desc LIKE ?
            LIMIT 100
        `);

        const searchTerm = `%${searchText}%`;

        stmt.bind([
            searchTerm,
            searchTerm,
            searchTerm
        ]);

        let html = `
            <table border="1" cellpadding="5">
                <tr>
                    <th>Code</th>
                    <th>Short Desc</th>
                    <th>Long Desc</th>
                    <th>Status</th>
                </tr>
        `;

        let count = 0;

        while (stmt.step()) {

            const row = stmt.getAsObject();

            html += `
                <tr>
                    <td>${row.code || ""}</td>
                    <td>${row.short_desc || ""}</td>
                    <td>${row.long_desc || ""}</td>
                    <td>${row.status || ""}</td>
                </tr>
            `;

            count++;
        }

        stmt.free();

        html += "</table>";

        if (count === 0) {
            html = "<p>No results found.</p>";
        }

        document.getElementById("results").innerHTML =
            html;

    } catch (err) {

        console.error(err);

        document.getElementById("results").innerHTML =
            "<p>Search failed.</p>";
    }
}


/* ---------- PWA ---------- */

if ('serviceWorker' in navigator) {

    window.addEventListener('load', () => {

        navigator.serviceWorker
            .register('sw.js')
            .then(reg => {

                console.log(
                    'Service Worker Registered',
                    reg
                );

            })
            .catch(err => {

                console.error(
                    'Service Worker Registration Failed',
                    err
                );

            });

    });

}