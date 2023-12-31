import express from 'express';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import cors from 'cors';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
	app.use(cors());
}

app.use(express.static(join(__dirname, 'notes-app-client/build')));
app.use(express.json());

const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'), (error) => {
	if (error) {
		console.error(error);
	} else {
		console.log('Connected to SQLite database');

		db.exec(fs.readFileSync('./schema.sql', 'utf8'), (schemaErr) => {
			if (schemaErr) {
				console.error(schemaErr);
			} else {
				console.log('Schema applied successfully');
			}
		});
	}
});

const getAllNotes = (db, userId) => {
	return new Promise((res) => {
		db.all(
			'SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC',
			[userId],
			(error, notes) => {
				res({ notes, error });
			}
		);
	});
};

const addNote = (db, userId) =>
	new Promise((res) => {
		const date = new Date().toISOString();
		db.run(
			'INSERT INTO notes (title, text, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?)',
			['New Note', '', date, date, userId],
			function (error) {
				res({ error, id: this.lastID });
			}
		);
	});

const deleteNote = (db, noteId) =>
	new Promise((res) => {
		db.run('DELETE FROM notes WHERE id = ?', [noteId], function (error) {
			res({ error });
		});
	});

app.post('/api/notes', async (req, res) => {
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));
	const addedNote = await addNote(db, req.body.userId);

	if (addedNote.error) {
		res.status(500).send({ error: error });
	} else {
		const { notes, error } = await getAllNotes(db, req.body.userId);

		if (error) {
			console.error(error);
			res.status(500).send('Error fetching notes');
		} else {
			res.json({ notes, newNoteId: addedNote.id });
		}
	}
	db.close();
});

app.get('/api/notes/:userId', async (req, res) => {
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));
	const userId = req.params.userId;
	const { notes, error } = await getAllNotes(db, userId);

	db.close();

	if (error) {
		console.error(error);
		res.status(500).send('Error fetching notes');
	} else {
		res.send(notes);
	}
});

app.put('/api/notes/:id', (req, res) => {
	const noteId = req.params.id;
	const updatedNote = req.body;
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.run(
		'UPDATE notes SET title = ?, text = ?, updatedAt = ? WHERE id = ?',
		[updatedNote.title, updatedNote.text, new Date().toISOString(), noteId],
		(error) => {
			if (error) {
				console.error(error);
				res.status(500).send('Error updating note');
			} else {
				res.status(200).send({ message: 'Updated note' });
			}
		}
	);

	db.close();
});

app.delete('/api/notes/:id', async (req, res) => {
	const noteId = req.params.id;
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));
	const deletedNote = await deleteNote(db, noteId);

	if (deletedNote.error) {
		res.status(500).send({ error: error });
	} else {
		const { notes, error } = await getAllNotes(db, req.body.userId);

		if (error) {
			console.error(error);
			res.status(500).send('Error fetching notes');
		} else {
			res.json({ notes });
		}
	}

	db.close();
});

app.get('*', (req, res) => {
	res.sendFile(join(__dirname + '/notes-app-client/build/index.html'));
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
