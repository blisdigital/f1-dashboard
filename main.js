
let currentNavItem = 'classification';

const today = new Date();
for (const race of races) {
    if (Date.parse(race.start) <= today && Date.parse(race.end) >= today) {
        currentNavItem = race.name;
    }
}

races.splice(0, 0, { name: "classification", title: "Klassement" });

function detectUrlHash() {
    if (!!window.location.hash) {
        const hash = window.location.hash.split("#")[1];
        if (!!hash
            && (hash === "classification"
                || results.hasOwnProperty(hash))) {
            currentNavItem = hash;
        }
    }

    if (currentNavItem === "classification") {
        loadClassification(results);
        buildResultsNav();
    } else if (results.hasOwnProperty(currentNavItem)) {
        loadResults(results[currentNavItem]);
        buildResultsNav();
    }
}

function calculateResults(results) {
    for (const result of results) {
        result.time = new TimeResult(result.time);
    }

    return results;
}

function orderResults(results) {
    results = results.slice();

    results.sort(function(a, b) {
        if (!a.time.totalSeconds && !b.time.totalSeconds) {
            return 0;
        } else if (!!a.time.totalSeconds && !b.time.totalSeconds) {
            return -1;
        } else if (!a.time.totalSeconds && !!b.time.totalSeconds) {
            return 1;
        }

        return a.time.totalSeconds < b.time.totalSeconds ? -1 : 1;
    });

    results.fastestInLeague = [];
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const driver = drivers[result.driver];

        result.points = !!result.time.hasTimeSet ? points[i] || 0 : 0;

        if (!!result.time.hasTimeSet
            && (!results.fastestInLeague.hasOwnProperty(driver.league.name)
                || result.time.totalSeconds < results.fastestInLeague[driver.league.name].time.totalSeconds)) {
            results.fastestInLeague[driver.league.name] = result;
        }
    }

    return results;
}

function loadResults(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("results__table");

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr>"
        + "<th>#</th>"
        + "<th>League</th>"
        + "<th>Naam</th>"
        + "<th>Snelste rondetijd</th>"
        + "<th>Delta</th>"
        + "<th>Totale delta</th>"
        + "<th>Simulator</th>"
        + "<th>Compound</th>"
        + "<th>Punten</th>"
        + "</tr>";
    table.append(thead);

    const tbody = document.createElement("tbody");

    for (const driverName in drivers) {
        const driver = drivers[driverName];
        
        const result = results.filter(function(r) { return r.driver === driverName })[0];
        if (!result) {
            results.push({
                driver: driverName,
                simulator: "",
                points: 0
            });
        }
    }

    calculateResults(results);

    const orderedResults = orderResults(results);
    let totalDeltaInSeconds = 0;

    let position = 1;
    let prevResult;
    for (const result of orderedResults) {
        const driver = drivers[result.driver];

        const row = document.createElement("tr");
        if (!result.time.hasTimeSet) {
            row.classList.add("results__row--no-time");
        }
        
        // #
        let col = document.createElement("td");
        col.classList.add("results__pos");
        col.innerHTML = position;
        row.append(col);

        // League
        col = document.createElement("td");
        col.classList.add("results__league", "results__league--" + driver.league.name);
        col.innerText = driver.league.title;
        row.append(col);

        // Naam
        col = document.createElement("td");
        col.classList.add("results__name");
        col.innerText = result.driver;
        row.append(col);

        // Rondetijd
        col = document.createElement("td");
        col.classList.add("results__time");
        col.innerText = result.time.toString();
        if (orderedResults.fastestInLeague[driver.league.name] && orderedResults.fastestInLeague[driver.league.name] === result) {
            col.classList.add("results__time--fastest");
        }

        row.append(col);

        // Delta
        const delta = prevResult && result.time.hasTimeSet ? result.time.getDeltaInSeconds(prevResult.time) : 0;
        totalDeltaInSeconds += delta;
        col = document.createElement("td");
        col.classList.add("results__delta");
        col.innerText = !!delta ? TimeResult.formatDelta(delta) : '';
        row.append(col);

        // Totale delta
        col = document.createElement("td");
        col.classList.add("results__total-delta");
        col.innerText = !!totalDeltaInSeconds && result.time.hasTimeSet ? "+" + TimeResult.formatTime(totalDeltaInSeconds) : "";
        row.append(col);

        // Simulator
        col = document.createElement("td");
        col.classList.add("results__simulator");
        col.innerText = result.simulator;
        row.append(col);

        // Compound
        col = document.createElement("td");
        col.classList.add("results__tyre");
        if (!!result.tyre) {
            const tyre = document.createElement("span");
            tyre.classList.add("tyre", "tyre--" + result.tyre);
            tyre.title = result.tyre;
            col.append(tyre);
        }

        row.append(col);

        // Punten
        col = document.createElement("td");
        col.classList.add("results__points");
        col.innerText = result.points;
        row.append(col);

        tbody.append(row);

        position++;
        prevResult = result;
    }

    table.append(tbody);

    container.append(table);
}

function loadClassification(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("results__table");

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr>"
        + "<th>#</th>"
        + "<th>League</th>"
        + "<th>Naam</th>"
        + "<th>Totale rondetijd</th>"
        + "<th>Delta</th>"
        + "<th>Totale delta</th>"
        + "<th>Totale punten</th>"
        + "</tr>";
    table.append(thead);

    const tbody = document.createElement("tbody");

    const driverTotals = {};
    for (const round in results) {
        calculateResults(results[round]);

        const orderedResults = orderResults(results[round]);
        for (const result of orderedResults) {
            const driver = drivers[result.driver];

            if (!driverTotals.hasOwnProperty(result.driver)) {
                driverTotals[result.driver] = {
                    driver: result.driver,
                    league: driver.league,
                    totalTime: !driver.disqualified ? new TimeResult(result.time) : 0,
                    totalPoints: !driver.disqualified ? result.points : 0
                };
            } else if (!driver.disqualified) {
                driverTotals[result.driver].totalTime = TimeResult.append(driverTotals[result.driver].totalTime, result.time);
                driverTotals[result.driver].totalPoints += result.points;
            }
        }
    }

    
    const sortedDriverTotals = Object.values(driverTotals).sort(function(a, b) {
        if (a.totalPoints > b.totalPoints) {
            return -1;
        } else if (a.totalPoints < b.totalPoints) {
            return 1;
        } else if (a.totalPoints == b.totalPoints) {
            return 0;
        }
    });

    let position = 1;
    let prevTotalTime = 0;
    let firstTotalTime = null;
    for (const result of sortedDriverTotals) {
        const driverClassification = driverTotals[result.driver];
        const driver = drivers[driverClassification.driver];

        if (firstTotalTime === null) {
            firstTotalTime = driverClassification.totalTime;
        }
        
        const row = document.createElement("tr");
        row.classList.add("results__row");
        if (position === 1) {
            row.classList.add("results__row--gold");
        } else if (position === 2) {
            row.classList.add("results__row--silver");
        } else if (position === 3) {
            row.classList.add("results__row--bronze");
        } else if (!driverClassification.totalTimeInSeconds) {
            row.classList.add("results__row--no-time");
        }
        
        // #
        let col = document.createElement("td");
        col.classList.add("results__pos");
        col.innerText = position;
        row.append(col);
        
        // League
        col = document.createElement("td");
        col.classList.add("results__league", "results__league--" + driver.league.name);
        col.innerText = driver.league.title;
        row.append(col);
        
        // Naam
        col = document.createElement("td");
        col.classList.add("results__name");
        col.innerText = driverClassification.driver;
        row.append(col);

        // Totale rondetijd
        col = document.createElement("td");
        col.classList.add("results__time");
        col.innerText = !!driver.disqualified ? "DSQ" : (!!driverClassification.totalTime.totalSeconds ? TimeResult.formatTime(driverClassification.totalTime.totalSeconds) : "");
        row.append(col);

        // Delta
        const delta = !!prevTotalTime && !!driverClassification.totalTime.totalSeconds ? driverClassification.totalTime.getDeltaInSeconds(prevTotalTime) : 0;
        col = document.createElement("td");
        col.classList.add("results__delta");
        col.innerText = !!delta ? TimeResult.formatDelta(delta) : "";
        row.append(col);

        // Totale delta
        const totalDelta = !!firstTotalTime && driverClassification.totalTime.totalSeconds ? driverClassification.totalTime.getDeltaInSeconds(firstTotalTime) : 0;
        col = document.createElement("td");
        col.classList.add("results__total-delta");
        col.innerText = !!totalDelta ? TimeResult.formatDelta(totalDelta) : "";
        row.append(col);

        // Totale punten
        col = document.createElement("td");
        col.classList.add("results__total-points");
        col.innerText = !!driver.disqualified ? "DSQ" : driverClassification.totalPoints;
        row.append(col);

        tbody.append(row);

        position++;
        prevTotalTime = driverClassification.totalTimeInSeconds;
    }

    table.append(tbody);

    container.append(table);
}

function buildResultsNav() {
    const navContainer = document.getElementById("results-nav");
    navContainer.innerHTML = "";

    for (const race of races) {
        const navItem = document.createElement("li");
        navItem.classList.add("results__nav-item");
        if (race.name === currentNavItem) {
            navItem.classList.add("results__nav-item--active");
        }

        const a = document.createElement("a");
        a.href = "#"+ race.name;
        a.innerText = race.title;
        navItem.append(a);

        navContainer.append(navItem);
    }
}

window.onload = function() {
    window.addEventListener("hashchange", detectUrlHash);
    detectUrlHash();
    buildResultsNav();
};
