
const express  = require("express");
const router   = express.Router();
const { shen } = require("../../shen");

router.get("/api/v1/session", (req, res) => {

	if(req.user) {

		res.status(200).json({

			success: true,
			loggedIn: true,
			user: {
				uuid: req.user.uuid,
				name: req.user.name,
				discriminator: req.user.discriminator
			}
		});
	}
	else {

		res.status(400).json({

			success: false
		});
	}
});

router.post("/api/v1/logout", (req, res) => {

	if(req.session.user) {

		console.log("the user " + req.session.user.tag + " is ending their session");
		
		req.session.user = null;
	}

	req.logout();
	req.session.destroy();
	res.send(401);
});

router.get("/api/v1/user", async (req, res) => {

	var name = req.query.name;
	var disc = req.query.disc;

	if(!name && !disc) {

		if(req.session.user) { // try to get the logged in user

			res.status(200).json({
				
				success: true,
				user: req.session.user
			});
		}
		else { // bad request

			res.status(400).json({

				success: false,
				error: "Not enough arguments; Missing 'name' or 'disc'"
			});
		}
	}
	else if(!disc) { // do search

		var users = await shen().searchUsers(name);
		var body = {

			success: true,
			found: users.length,
			users: []
		};

		users.map( user => {

			body.users.push({

				uuid: user.uuid,
				name: user.name,
				discriminator: user.discriminator
			});
		});

		res.status(200).json(body);
	}
	else {

		try { // try to get the user from query

			var user = await shen().getUser(name + "#" + disc);
			res.status(200).json({

				success: true,
				user: {
					uuid: user.id,
					name: user.name,
					discriminator: user.discriminator
				}
			});
		}
		catch (e) { // not found

			res.status(404).json({

				success: false,
				error: e.message
			});
		}
	}
});

router.get("/api/v1/ladder/:id", (req, res) => {

	var user = req.session.user;
	if(!user) {

		res.status(401).send({ success: "false" });
	}
	else {

		res.status(200);
		res.json({
			success: "true",
			message: {
				uuid: user.uuid,
				name: user.name,
				tag: user.tag
			}
		});
	}
});

router.get("/api/v1/game/:slug", async (req, res) => {

	var game = await shen().getGametitle(req.params.slug);

	if(game) {

		res.status(200).send({

			success: true,
			game: game
		});
	}
	else {
		
		res.status(401).send({

			success: false,
			error: "no game exists with this ID"
		});
	}
});

router.get("/api/v1/match/:id", async (req, res) => {

	try {

		var match = await shen().getMatch(req.params.id);
		res.status(200).json({
			success: true,
			match: match
		});
	}
	catch (e) {

		res.status(401).json({
			success: false,
			error: e.message
		});
	}
});

router.get("/api/v1/round/:id", async (req, res) => {

	var round = await shen().getRound(req.params.id);

	console.log("round: " + round);

	if(round) {

		res.status(200).json({
			success: true,
			round: round
		});
	}
	else {

		res.status(401).json({
			success: false,
			error: `round ${ req.params.id } does not exist`
		});
	}
});


module.exports = router;

