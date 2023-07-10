import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import fs from 'fs';

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 5000;

app.use(express.static(join(__dirname, 'client/build')));

app.use(bodyParser.json());

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

const getAllNotes = (db) => {
	return new Promise((res) => {
		db.all('SELECT * FROM notes ORDER BY updatedAt DESC', (error, notes) => {
			res({ notes, error });
		});
	});
};

const addNote = (db) =>
	new Promise((res) => {
		const date = new Date().toISOString();
		db.run(
			'INSERT INTO notes (title, text, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
			['New Note', '', date, date],
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

	const addedNote = await addNote(db);

	if (addedNote.error) {
		res.status(500).send({ error: error });
	} else {
		const { notes, error } = await getAllNotes(db);

		if (error) {
			console.error(error);
			res.status(500).send('Error fetching notes');
		} else {
			res.json({ notes, newNoteId: addedNote.id });
		}
	}
	db.close();
});

app.get('/api/notes', async (req, res) => {
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));
	const { notes, error } = await getAllNotes(db);
	db.close();

	if (error) {
		console.error(error);
		res.status(500).send('Error fetching notes');
	} else {
		res.send(notes);
	}
});

app.get('/api/notes/:id', (req, res) => {
	const noteId = req.params.id;
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.get('SELECT * FROM notes WHERE id = ?', [noteId], (error, row) => {
		if (error) {
			console.error(error);
			res.status(500).send('Error fetching note');
		} else if (row) {
			res.send(row);
		} else {
			res.status(404).send({ error: 'Note not found' });
		}
	});

	db.close();
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
		const { notes, error } = await getAllNotes(db);

		if (error) {
			console.error(error);
			res.status(500).send('Error fetching notes');
		} else {
			res.json({ notes });
		}
	}

	db.close();
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
