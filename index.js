import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import { resolve, dirname } from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 8080;

app.use(cors());

app.use(bodyParser.json());

const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'), (err) => {
	if (err) {
		console.error(err);
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

app.post('/api/notes', (req, res) => {
	const note = req.body;
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.run(
		'INSERT INTO notes (title, text) VALUES (?, ?)',
		[note.title, note.text],
		(err) => {
			if (err) {
				console.error(err);
				res.status(500).send('Error creating note');
			} else {
				res.send('Note created successfully');
			}
		}
	);

	db.close();
});

app.get('/api/notes', (req, res) => {
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.all('SELECT * FROM notes', (err, rows) => {
		if (err) {
			console.error(err);
			res.status(500).send('Error fetching notes');
		} else {
			res.send(rows);
		}
	});

	db.close();
});

app.get('/api/notes/:id', (req, res) => {
	const noteId = req.params.id;
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, row) => {
		if (err) {
			console.error(err);
			res.status(500).send('Error fetching note');
		} else if (row) {
			res.send(row);
		} else {
			res.status(404).send('Note not found');
		}
	});

	db.close();
});

app.put('/api/notes/:id', (req, res) => {
	const noteId = req.params.id;
	const updatedNote = req.body;

	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.run(
		'UPDATE notes SET title = ?, text = ? WHERE id = ?',
		[updatedNote.title, updatedNote.text, noteId],
		(err) => {
			if (err) {
				console.error(err);
				res.status(500).send('Error updating note');
			} else {
				res.send('Note updated successfully');
			}
		}
	);

	db.close();
});

app.delete('/api/notes/:id', (req, res) => {
	const noteId = req.params.id;
	const db = new sqlite3.Database(resolve(__dirname, 'db.sqlite'));

	db.run('DELETE FROM notes WHERE id = ?', [noteId], (err) => {
		if (err) {
			console.error(err);
			res.status(500).send('Error deleting note');
		} else {
			res.send('Note deleted successfully');
		}
	});

	db.close();
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
