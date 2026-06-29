let db;

/* ---------------------------
   Page Load
---------------------------- */

window.addEventListener("load", async () => {

    loadSavedDatabase();

    if ('serviceWorker' in navigator) {

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

    }

});


/* ---------------------------
   Load Database From File
---------------------------- */

async function loadDatabase() {

    const fileInput =
        document.getElementById("dbFile");

    if (!fileInput.files.length) {

        alert(
            "Please select a database file."
        );

        return;
    }

    const file =
        fileInput.files[0];

    document.getElementById("status")
        .innerHTML =
        "Loading Database...";

    try {

        const SQL =
            await initSqlJs({
                locateFile: file => file
            });

        const buffer =
            await file.arrayBuffer();

        saveDatabaseToIndexedDB(buffer);

        console.time("DB Load");

        db =
            new SQL.Database(
                new Uint8Array(buffer)
            );

        console.timeEnd("DB Load");

        document.getElementById("status")
            .innerHTML =
            "✅ Database Loaded & Saved";

    }
    catch (err) {

        console.error(err);

        document.getElementById("status")
            .innerHTML =
            "❌ Database Load Failed";

        alert(
            "Failed to load database."
        );
    }
}


/* ---------------------------
   Save Database
---------------------------- */

function saveDatabaseToIndexedDB(buffer) {

    const request =
        indexedDB.open(
            "MaterialDB",
            1
        );

    request.onupgradeneeded =
        function(event) {

        const idb =
            event.target.result;

        if (
            !idb.objectStoreNames.contains(
                "files"
            )
        ) {
            idb.createObjectStore(
                "files"
            );
        }

    };

    request.onsuccess =
        function(event) {

        const idb =
            event.target.result;

        const tx =
            idb.transaction(
                "files",
                "readwrite"
            );

        tx.objectStore("files")
            .put(
                buffer,
                "materials"
            );

        console.log(
            "Database saved locally."
        );

    };

}


/* ---------------------------
   Auto Load Database
---------------------------- */

async function loadSavedDatabase() {

    const request =
        indexedDB.open(
            "MaterialDB",
            1
        );

    request.onupgradeneeded =
        function(event) {

        const idb =
            event.target.result;

        if (
            !idb.objectStoreNames.contains(
                "files"
            )
        ) {
            idb.createObjectStore(
                "files"
            );
        }

    };

    request.onsuccess =
        async function(event) {

        const idb =
            event.target.result;

        const tx =
            idb.transaction(
                "files",
                "readonly"
            );

        const req =
            tx.objectStore("files")
              .get("materials");

        req.onsuccess =
            async function() {

            if (!req.result)
                return;

            document.getElementById(
                "status"
            ).innerHTML =
            "Loading Saved Database...";

            const SQL =
                await initSqlJs({
                    locateFile:
                        file => file
                });

            db =
                new SQL.Database(
                    new Uint8Array(
                        req.result
                    )
                );

            document.getElementById(
                "status"
            ).innerHTML =
            "✅ Database Auto Loaded";

        };

    };

}


/* ---------------------------
   Search
---------------------------- */

function searchMaterial() {

    if (!db) {

        alert(
            "Load database first."
        );

        return;
    }

    const searchText =
        document
        .getElementById(
            "searchText"
        )
        .value
        .trim();

    if (searchText === "")
        return;

    try {

        const words =
            searchText
            .split(/\s+/)
            .filter(w => w.length > 0);

        let whereClauses = [];
        let params = [];

        words.forEach(word => {

            whereClauses.push(`
            (
                code LIKE ?
                OR short_desc LIKE ?
                OR long_desc LIKE ?
            )
            `);

            const term = `%${word}%`;

            params.push(term);
            params.push(term);
            params.push(term);

        });

        const query = `
            SELECT
                code,
                short_desc,
                long_desc,
                status
            FROM materials
            WHERE
                ${whereClauses.join(" AND ")}
            LIMIT 100
        `;

        const stmt =
            db.prepare(query);

        stmt.bind(params);

        let html = `
            <p><b>Searching:</b> ${searchText}</p>

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

            const row =
                stmt.getAsObject();

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

            html =
                `<p>No results found for <b>${searchText}</b></p>`;

        } else {

            html =
                `<p><b>${count}</b> results found</p>`
                + html;
        }

        document
            .getElementById("results")
            .innerHTML =
            html;

    }
    catch (err) {

        console.error(err);

        document
            .getElementById("results")
            .innerHTML =
            "<p>Search failed.</p>";
    }

}


/* ---------------------------
   Reset Database
---------------------------- */

function clearDatabase() {

    if (
        !confirm(
            "Remove saved database?"
        )
    )
        return;

    const request =
        indexedDB.open(
            "MaterialDB",
            1
        );

    request.onsuccess =
        function(event) {

        const idb =
            event.target.result;

        const tx =
            idb.transaction(
                "files",
                "readwrite"
            );

        tx.objectStore("files")
            .delete(
                "materials"
            );

        alert(
            "Database removed."
        );

        location.reload();

    };

}
