
var Elo =     require("./elo");
var Options = require("./util/options");
//var RangeMap = require("./rangemap");

/**
 * Represents a rating division. This is aimed at grouping players by similar
 * skill ratings.
 */
class Division {
	constructor(options) {
		options = Options.merge({
			name: "NULL",
			start: 0,
			k:     40,
			gain:  1.0,
			loss:  1.0,
		}, options);
		/**
		 * The name of the division.
		 * @type {string}
		 */
		Object.defineProperty(this, "name", {value: options.name});
		/**
		 * The skill rating that a player has to reach to be in this division.
		 * @type {string}
		 */
		Object.defineProperty(this, "start", {value: options.start});
		/**
		 * The K-factor to use when in this division.
		 * @type {number}
		 */
		Object.defineProperty(this, "k", {value: options.k});
		/**
		 * Gain Multiplier - If a player wins a match while in this division,
		 * then the rating adjustment will be multiplied by this value.
		 * @type {number}
		 */
		Object.defineProperty(this, "gain", {value: options.gain});
		/**
		 * Loss Multiplier - If a player loses a match while in this division,
		 * then the rating adjustment will be multiplied by this value.
		 * @type {number}
		 */
		Object.defineProperty(this, "loss", {value: options.loss});
	}
}

/**
 * Represents an extension to the Elo rating system by taking into account
 * rating divisions and various other things specific to Shen's ranking system.
 */
class Ranker {
	constructor(options = {}) {
		options = Options.merge({
			floor:   950,
			initial: 1000, // the initial rating for users
			divisions: [
				new Division({name: "C", start: 0,    k: 48}),
				new Division({name: "B", start: 1000, k: 32}),
				new Division({name: "A", start: 1050, k: 24}),
				new Division({name: "S", start: 1100, k: 16})
			]
		}, options);
		// sort the divisions array first by starting ratings
		options.divisions.sort((a, b) => { return a.start - b.start; });

		/**
		 * The Elo instance, which handles all basic Elo functions.
		 * @type {Elo}
		 */
		Object.defineProperty(this, "elo", {value: new Elo()});
		/**
		 * The rating "floor". Rating adjustments will never set a user's
		 * rating lower than this value.
		 * @type {number}
		 */
		Object.defineProperty(this, "floor", {value: options.floor});
		Object.defineProperty(this, "initial", {value: options.initial});
		Object.defineProperty(this, "divisions", {value: options.divisions});
	}

	/**
	 * Gets the division at this rating.
	 *
	 * @param  {type} rating description
	 * @returns {type}        description
	 */
	getDivision(rating = 0) {
		var match = this.divisions[0]; // the division to use
		this.divisions.forEach(division => {
			// use this division if the rating is at least the start of the division
			if(rating >= division.start) match = division;
		});
		return match;
	}

	/**
	 * Adjusts the given user statistics given a match.
	 *
	 * @param  {type} stats description
	 * @param  {type} score description
	 * @returns {type}       description
	 */
	adjust(stats, match, standings) {
		if(!match.hasUser(stats.user)) {
			throw new ReferenceError(
				"This match does not contain this user: " + stats.user.nickname + "\n"
				+ "Players in this match: " + match.users
			);
		}

		//== hidden division ==//
		var bonus = 1.0;
		var division;
		if(stats.matches.length < 3) { // if this match is one of the first three matches, give a bonus.
			division = new Division({
				name: "Hidden",
				start: 0,
				k: 40
			});
			//bonus = 1.5;
		} else {
			division = this.getDivision(stats.rating);
		}

		//stats = stats.incrementTotalMatches();
		//var division = this.getDivision(stats.rating);
		var opponent = match.getOpponents(stats.user)[0];
		var opponentRating = standings.getStats(opponent).rating;

		//console.log(`using division ${division.name} k:${division.k} gain:${division.gain} loss:${division.loss}`);
		//console.log(`opponent rating: ${opponentRating}`);

		let adjustment = 0;

		if(match.isWinner(stats.user)) { // user won
			stats = stats.incrementWins();
			// get rating adjustment using Elo
			adjustment = Math.ceil(Elo.adjust(stats.rating, opponentRating, 1, division.k) * division.gain * bonus);
			if(stats.matches.length > 3) {
				stats = stats.adjustPoints(adjustment);
			}
		} else { // user lost
			adjustment = Math.ceil(Elo.adjust(stats.rating, opponentRating, 0, division.k) * division.loss * bonus);
		}

		// apply floor value
		if(stats.rating + adjustment < this.floor) {
			adjustment = this.floor - stats.rating;
			stats = stats.adjustPoints(0);
		}

		console.log("rating adjustment: " + adjustment);

		return stats.adjustRating(adjustment);
	}
}

module.exports = Ranker;
