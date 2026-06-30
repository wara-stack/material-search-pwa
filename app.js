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

/* ---------------------------
   Code Search
---------------------------- */

function searchMaterial() {

    if (!db) {
        alert("Load database first.");
        return;
    }

    const codeText =
        document.getElementById("codeSearch")
        .value
        .trim()
        .toLowerCase();

    const descText =
        document.getElementById("descSearch")
        .value
        .trim()
        .toLowerCase();

    let whereClauses = [];
    let params = [];

    if (codeText !== "") {

        whereClauses.push(
            "LOWER(COALESCE(code,'')) LIKE ?"
        );

        params.push(`%${codeText}%`);
    }

    if (descText !== "") {

        const words = descText
            .split(/\s+/)
            .filter(w => w.length > 0);

        words.forEach(word => {

            whereClauses.push(`
                (
                    LOWER(COALESCE(short_desc,'')) LIKE ?
                    OR
                    LOWER(COALESCE(long_desc,'')) LIKE ?
                )
            `);

            params.push(`%${word}%`);
            params.push(`%${word}%`);

        });
    }

    if (whereClauses.length === 0) {
        alert("Enter search criteria.");
        return;
    }

    const query = `
        SELECT
            code,
            short_desc,
            long_desc,
            status
        FROM materials
        WHERE
            ${whereClauses.join(" AND ")}
        LIMIT 500
    `;

    const stmt = db.prepare(query);

    stmt.bind(params);

    displayResults(
        stmt,
        `${codeText} ${descText}`
    );
}

/* ---------------------------
   Display Results
---------------------------- */

function displayResults(stmt, searchText) {

    let html = "";
    let count = 0;

    while (stmt.step()) {

        const row = stmt.getAsObject();

        html += `
            <div class="result-card">
                <div><b>Code:</b> ${row.code || ""}</div>
                <div><b>Short Desc:</b> ${row.short_desc || ""}</div>
                <div><b>Long Desc:</b> ${row.long_desc || ""}</div>
                <div><b>Status:</b> ${row.status || ""}</div>
            </div>
        `;

        count++;
    }

    stmt.free();

    if (count === 0) {

        html =
            `<p>No results found for <b>${searchText}</b></p>`;

    } else {

        html =
            `<p><b>${count}</b> results found (max 500 shown)</p>` +
            html;
    }

    document.getElementById("results").innerHTML = html;
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

/* ---------------------------
   Enter Key Search
---------------------------- */

document.addEventListener("DOMContentLoaded", function () {

    const searchBox =
        document.getElementById("searchText");

    if (searchBox) {

        searchBox.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {
                    searchMaterial();
                }

            }
        );

    }

});

