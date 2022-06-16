
function TimeResult(time) {
    if (typeof(time) === "object") {
        if (time.originalTimeString !== undefined) {
            console.log("new:", time);
            return new TimeResult(time.originalTimeString);
        } else {
            throw new Error("Invalid argument: time", time);
        }
    }

    let _hours = 0;
    let _minutes = 0;
    let _seconds = 0.0;
    let _dns = !time || time === "DNS";
    let _dnf = time === "DNF";
    let _disqualified = time === "DSQ";

    if (!!time && !_dns && !_dnf && !_disqualified) {
        const hmsParts = time.split(":");
        if (hmsParts.length === 0) {
            _seconds = parseFloat(time) || 0.0;
        } else if (hmsParts.length === 1) {
            _seconds = parseFloat(hmsParts[0]) || 0.0;
        } else if (hmsParts.length === 2) {
            _minutes = parseInt(hmsParts[0]) || 0;
            _seconds = parseFloat(hmsParts[1]) || 0.0;
        } else if (hmsParts.length === 3) {
            _hours = parseInt(hmsParts[0]) || 0;
            _minutes = parseInt(hmsParts[1]) || 0;
            _seconds = parseFloat(hmsParts[2]) || 0.0;
        }

        _minutes += Math.floor(_seconds / 60);
        _hours += Math.floor(_minutes / 60);
        _minutes = _minutes % 60;
        _seconds = _seconds % 60;
    } else {
        _seconds = TimeResult.PenaltyTotalTimeInSeconds % 60;
        _minutes = Math.floor(TimeResult.PenaltyTotalTimeInSeconds / 60);
        _minutes = Math.floor(TimeResult.PenaltyTotalTimeInSeconds / 60 / 60);
    }

    const result = {
        originalTimeString: !!time ? time : "",

        get seconds() {
             return _seconds;
        },

        get minutes() {
             return _minutes;
        },

        get hours() {
             return _hours;
        },

        get totalSeconds() {
            return this.hasTimeSet
                ? (_hours * 60 * 60) + (_minutes * 60) + _seconds
                : TimeResult.PenaltyTotalTimeInSeconds;
        },

        get didNotStart() {
            return _dns;
        },

        get didNotFinish() {
            return _dnf;
        },

        get disqualifed() {
            return _disqualified;
        },

        get hasTimeSet() {
            return !_dns && !_dnf && !_disqualified && (!!_seconds || !!_minutes || !!_hours);
        },

        getDeltaInSeconds: function(otherTimeResult) {
            return this.totalSeconds - otherTimeResult.totalSeconds;
        },
        
        toString: function() {
            if (this.didNotStart) {
                return "DNS";
            } else if (this.didNotFinish) {
                return "DNF";
            } else if (this.disqualifed) {
                return "DSQ";
            } else if (!this.hasTimeSet) {
                return "NTB";
            }

            return TimeResult.formatTime(this.totalSeconds);
        }
    };

    return result;
}

TimeResult.PenaltyTotalTimeInSeconds = 180;

TimeResult.fromSeconds = function(totalSeconds) {
    return new TimeResult(TimeResult.formatTime(totalSeconds));
}

TimeResult.noTime = function() {
    return new TimeResult("");
};

TimeResult.didNotStart = function() {
    return new TimeResult("DNS");
};

TimeResult.didNotFinish = function() {
    return new TimeResult("DNF");
};

TimeResult.disqualified = function() {
    return new TimeResult("DSQ");
};

TimeResult.append = function(time1, time2) {
    return TimeResult.fromSeconds(time1.totalSeconds + time2.totalSeconds);
}

TimeResult.formatTime = function(seconds) {
    const negativeTime = seconds < 0;
    
    seconds = Math.abs(seconds);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    seconds = seconds % 60;

    let result = negativeTime ? "-" : "";
    if (!!hours) {
        result += (hours < 10 ? "0" + hours : hours) + ":";
    }

    if (!!hours || !!minutes) {
        result += (minutes < 10 ? "0" + minutes : minutes) + ":";
    }

    result += (!!hours || !!minutes) && seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);
    return result;
};

TimeResult.formatDelta = function(seconds) {
    return (seconds >= 0 ? "+" : "") + TimeResult.formatTime(seconds);
};