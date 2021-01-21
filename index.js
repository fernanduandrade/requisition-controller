//Imports para o funcionando do servidor
import express from 'express';
import flash from 'express-flash';
import session from 'express-session';

import { Strategy as LocalStrategy} from 'passport-local'


import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';

import morgan from 'morgan';
import log from 'log-beautify';

//import para conecção com db
import mongoose from 'mongoose';

//variaveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

//Imports do Model e Serviço

import requisition from './model/Requisition.js';

import RequisitionService from './services/RequesitionService.js';

//Mongo model
const RequisitionModel = mongoose.model("Requisition", requisition);

//passport

import passport from 'passport'


//Instânciando o express
const app = express();

//Porta do servidor
const port = 9000;

//Conexão com Mongo
mongoose.connect("mongodb://localhost:27017/appointments",{useNewUrlParser: true, useUnifiedTopology: true})
mongoose.set('useFindAndModify', false);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(session({
   secret:'secret',
  saveUninitialized: true,
   resave: true
}));

//Log das requesições
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

//Parser dados das requesições 
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//Template engine 
app.set('view engine', 'ejs');

//Arquivos estátco
app.use(express.static("public"));

//Permitir outros usar localmente
app.use(cors());

//Rotas
app.get('/', (req, res) => {
	res.render('index');
});

app.get('/liberados', async(req, res) => {

	const requisition = await RequisitionService.GetAllRequisitions(false);
	res.json(requisition);

});

app.get('/cadastro', (req, res) => {
	res.render('registerRequisition');
});

app.get('/lista', async(req,res) => {
	
	try {
		const {page = 1, limit = 5} = req.query;

		const requisitions = await RequisitionModel.find()
		.limit(limit * 1)
		.skip((page - 1) * limit);

		const totalRegister = await RequisitionService.getTotalRegisters();
		
		res.render('listRequisition', {requisitions, totalRegister});
	
	} catch(err) {
		console.error(err);
	}
	
	// let requisitions = await RequisitionService.GetAllRequisitions(true);
	
});

app.get('/pesquisarAgendado', async(req, res) => {
	

	const query = req.query.search;
	
	const totalRegister = await RequisitionService.getTotalRegisters();

	const requisitions = await RequisitionService.Search(query);

	res.render('listRequisition', {requisitions, totalRegister});

});

app.get('/paciente/:id', async (req, res) => {
	
	const id = req.params.id;
	const requisition = await RequisitionService.GetRequisitionById(id);

	res.render('userRequisition', {requisition});

});

app.get('/register', (req, res) => {
	res.render('registerUserAdmin');
});

app.post('/register', async(req, res) => {
	
	try {

		const hashedPassword = await bcrypt.hash(req.body.password, 10);

		const data = await RequisitionService.UserAdmin(
			req.body.name,
			req.body.email,
			hashedPassword
		);

		if(data) {
			res.redirect('/login');
		} else {
			res.redirect('/register');
		}
	}catch(err) {
		console.error(err.message);
	}
});

app.get('/login', (req, res) => {
	res.render('login');
});


app.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect:'/login', 
	failureFlash: 'Usuário ou senha inválido',
	successFlash: 'Credenciais corretas'
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  RequisitionService.GetRequisitionById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new LocalStrategy({
    usernameField: 'name',
    passwordField: 'password'
},
    async (name, password, done) => {
        try {
            const user = await RequisitionService.getUserByName(name);
 
            // usuário inexistente
            if (!user) { return done(null, false) }
 
            // comparando as senhas
            const isValid = bcrypt.compareSync(password, user.password);
            if (!isValid) return done(null, false)
 
            return done(null, user)
        } catch (err) {
            done(err, false);
        }
    }
));

app.get('/logout', (req, res) => {
	res.send('teste');
});

app.post('/cadastro', async(req, res) => {
	const data = await RequisitionService.Register(
		req.body.name,
		req.body.phone,
		req.body.date,
		req.body.location,
		req.body.exam
	);

	if(data) {
		res.redirect('/');
	} else {
		res.status(400);
	}
});

app.get('/editar/:id', async(req,res) => {
	const id = req.params.id;

	const requisition = await RequisitionService.GetRequisitionById(id);

	res.render('editUser', {requisition});

});

app.post('/editar', async(req, res) => {
	const {_id, name, phone, date, location, exam} = req.body;

	const currentValues = {name, phone, date, location, exam}

	const user = await RequisitionModel.findByIdAndUpdate({_id}, currentValues,{new: true});

	if(user) {
		res.redirect('/');
	} else {
		res.status(400);
	}
});

app.get('/usuario/:id', async(req, res) => {

	const _id = req.params.id;

	const result = await RequisitionService.deleteUser(_id);

	if(result) {
		res.redirect('/lista?page=1&limit=5');
	} else {
		res.status(400);
	}
});

//Log costumizada 
log.setColors({
    custom_: "green",
});
log.setSymbols({
    custom_: "✅ ",
});

//Iniciando o servidor
app.listen(port, () => {
	log.custom_(`Server listening on port ${port}`);
});