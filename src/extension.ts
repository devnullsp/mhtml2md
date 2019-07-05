import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";
import { isNullOrUndefined } from 'util';
let readl = require("n-readlines");
let dom = require('xmldom').DOMParser;


export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mhtml2md', (uri:vscode.Uri) => {
		if(!isNullOrUndefined(uri)) {
			console.log(uri.fsPath);
			vscode.window.showInformationMessage('Convirtiendo fichero '+ uri.fsPath);
			procesarFichero(uri.fsPath);
			vscode.window.showInformationMessage('FIN proceso fichero '+ uri.fsPath);
			return;
		}
		// The code you place here will be executed every time your command is executed
		const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Open',
				filters: {
				'mhtml files': ['mhtml','mht'],
				'All files': ['*']
				}
			};
		vscode.window.showOpenDialog(options).then(fileUri => {
			if (fileUri && fileUri[0]) {
				vscode.window.showInformationMessage('Convirtiendo fichero '+ fileUri[0].fsPath);
				procesarFichero(fileUri[0].fsPath);
				vscode.window.showInformationMessage('FIN proceso fichero '+ fileUri[0].fsPath);
			}
		});
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

//-------------------------------------------------------------------------------------------------------------------------
//implementación de proceso
//-------------------------------------------------------------------------------------------------------------------------
function procesarFichero(_path: string){
	//separo el path del nombre y genero los datos necesarios
	let pparse 		= path.parse(_path);
	let directorio 	= pparse.dir+path.sep+pparse.name+"_img";
	let nomdir      = pparse.name+"_img/";
	let fSalida     = pparse.dir+path.sep+pparse.name+".md";
	console.log('mhtml2md: procesar ' + _path+" en "+directorio);
	console.log('mhtml2md: fichero salida '+fSalida);
	
	if (!fs.existsSync(directorio)){
		fs.mkdirSync(directorio);
	}
	let ws = fs.createWriteStream(fSalida);
	console.log('directorio creado');
	let liner = new readl(_path);
	let line = "";
	let l = "";
	console.log("mthml2md: leyendo fichero");
	//Desprecio la primera parte del fichero hasta el primer --
	while (line = liner.next()) {
		l = line.toString().trimLeft();
		if(l.startsWith('--')) {
			break;
		}
	}
	//Ahora leo hasta la siguiente parte y todo lo que leo a partir de las doslineas en blanco es el documento html
	let documentohtml = "";
	while (line = liner.next()) {
		l = line.toString().trimLeft();
		if(l==='') {
			liner.next();
			break;
		}
	}
	while (line = liner.next()) {
		l = line.toString().trimLeft();
		if(l.startsWith('--')) {
			break;
		}
		documentohtml=documentohtml+'\n'+l;
	}
	let ssfn = "";
	//console.log(documentohtml);
	let doc = new dom().parseFromString(documentohtml);
	let n = doc.getElementsByTagName("EachAction");
	let c = null;
	for(let i=0; i< n.length; i++){
		console.log("Procesando "+i);
		c = n[i].getElementsByTagName("Description")[0];
		if(!isNullOrUndefined(c)){
			ws.write("## "+c.childNodes[0].data+"\n");
		}
		c = n[i].getElementsByTagName("Action")[0];
		if(isNullOrUndefined(c)) {
			c = n[i].getElementsByTagName("UserComment")[0];
			ws.write("## "+c.childNodes[0].data+"*\n");
			ws.write("- X/Y Pantalla "+n[i].getElementsByTagName("ScreenCoordsXYWH")[0].childNodes[0].data+"\n\n");
			ws.write("- X/Y/W/H zona "+n[i].getElementsByTagName("HighlightXYWH")[0].childNodes[0].data+"\n\n");
		}else{
			ws.write("- *"+c.childNodes[0].data+"*\n");
			ws.write("- Cursor X/Y "+n[i].getElementsByTagName("CursorCoordsXY")[0].childNodes[0].data+"\n");
			ws.write("- X/Y Pantalla "+n[i].getElementsByTagName("ScreenCoordsXYWH")[0].childNodes[0].data+"\n\n");
		}
		ssfn = n[i].getElementsByTagName("ScreenshotFileName")[0].childNodes[0].data;		
		ws.write("!["+ssfn+"]("+nomdir+ssfn+")\n\n");
	}


	for(let i=0; i<n.length; i++){
		ssfn = n[i].getElementsByTagName("ScreenshotFileName")[0].childNodes[0].data;
		//Leer hasta la linea que ponga el screen y al valor y luego leo la linea en blanco
		while (line = liner.next()) {
			l = line.toString().trim();
			if(l === 'Content-Location: '+ssfn) {
				liner.next();
				break;
			}
		}
		let b = "";
		while (line = liner.next()) {
			l = line.toString().trim();
			if(l === '') {
				break;
			}
			b = b+l+"\n";
		}
		fs.writeFileSync(directorio+path.sep+ssfn, b, 'base64');
	}
}


