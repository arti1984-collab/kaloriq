/* ============================================================
   Kaloriq – Lebensmitteldatenbank
   • lokale Basisliste (funktioniert offline, Richtwerte pro 100 g)
   • Open Food Facts für Suche + Barcode (online)
   ============================================================ */
import { enOf } from './i18n.js';

const SEED_RAW = [
  // name, Gruppe, kcal, Protein, KH, Fett, Portion-Label, Portion-Gramm
  ['Vollkornbrot', 'Brot & Backwaren', 213, 7.5, 38.0, 2.2, 'Scheibe', 50],
  ['Weizenbrot', 'Brot & Backwaren', 265, 8.5, 51.0, 2.0, 'Scheibe', 50],
  ['Baguette', 'Brot & Backwaren', 274, 8.8, 54.0, 1.6, 'Stück', 120],
  ['Toastbrot', 'Brot & Backwaren', 265, 8.5, 49.0, 3.5, 'Scheibe', 25],
  ['Brötchen', 'Brot & Backwaren', 275, 8.5, 55.0, 1.6, 'Stück', 60],
  ['Croissant', 'Brot & Backwaren', 406, 8.2, 45.0, 21.0, 'Stück', 60],
  ['Knäckebrot', 'Brot & Backwaren', 350, 9.0, 70.0, 2.0, 'Scheibe', 10],
  ['Laugenbrezel', 'Brot & Backwaren', 270, 8.0, 52.0, 2.5, 'Stück', 85, 3.0],
  ['Roggenbrot', 'Brot & Backwaren', 216, 6.5, 41.0, 1.5, 'Scheibe', 50, 6.0],
  ['Vollkorntoast', 'Brot & Backwaren', 250, 9.0, 42.0, 3.5, 'Scheibe', 30, 6.0],
  ['Ciabatta', 'Brot & Backwaren', 271, 8.5, 54.0, 1.5, 'Stück', 80, 3.0],
  ['Fladenbrot', 'Brot & Backwaren', 275, 9.0, 55.0, 2.0, 'Stück', 120, 3.0],
  ['Bagel', 'Brot & Backwaren', 257, 10.0, 50.0, 1.7, 'Stück', 100, 2.5],
  ['Haferflocken', 'Beilagen & Getreide', 372, 13.5, 58.7, 7.0, 'Portion', 50],
  ['Müsli', 'Beilagen & Getreide', 380, 9.0, 65.0, 7.0, 'Portion', 50],
  ['Cornflakes', 'Beilagen & Getreide', 357, 7.5, 84.0, 0.4, 'Portion', 40],
  ['Nudeln, gekocht', 'Beilagen & Getreide', 158, 5.8, 30.9, 0.9, 'Portion', 200],
  ['Reis, gekocht', 'Beilagen & Getreide', 130, 2.7, 28.0, 0.3, 'Portion', 200],
  ['Couscous, gekocht', 'Beilagen & Getreide', 112, 3.8, 23.0, 0.2, 'Portion', 180],
  ['Quinoa, gekocht', 'Beilagen & Getreide', 120, 4.4, 21.0, 1.9, 'Portion', 180],
  ['Kartoffeln, gekocht', 'Beilagen & Getreide', 70, 2.0, 15.0, 0.1, 'Portion', 200],
  ['Süßkartoffel', 'Beilagen & Getreide', 86, 1.6, 20.0, 0.1, 'Portion', 200],
  ['Kartoffelpüree', 'Beilagen & Getreide', 108, 2.0, 16.0, 4.0, 'Portion', 200],
  ['Pommes frites', 'Beilagen & Getreide', 312, 3.4, 41.0, 15.0, 'Portion', 150],
  ['Bratkartoffeln', 'Beilagen & Getreide', 180, 3.0, 24.0, 8.0, 'Portion', 200],
  ['Basmatireis, gekocht', 'Beilagen & Getreide', 130, 2.7, 28.0, 0.3, 'Portion', 200, 0.4],
  ['Vollkornreis, gekocht', 'Beilagen & Getreide', 123, 2.7, 25.6, 1.0, 'Portion', 200, 1.6],
  ['Vollkornnudeln, gekocht', 'Beilagen & Getreide', 149, 5.5, 30.0, 1.0, 'Portion', 200, 4.0],
  ['Bulgur, gekocht', 'Beilagen & Getreide', 83, 3.1, 18.6, 0.2, 'Portion', 180, 4.5],
  ['Hirse, gekocht', 'Beilagen & Getreide', 119, 3.5, 23.7, 1.0, 'Portion', 180, 1.3],
  ['Gnocchi', 'Beilagen & Getreide', 133, 4.0, 28.0, 0.5, 'Portion', 200, 1.5],

  ['Magerquark', 'Milchprodukte & Eier', 67, 12.0, 4.0, 0.2, 'Portion', 200],
  ['Speisequark 20 %', 'Milchprodukte & Eier', 128, 12.0, 3.4, 5.5, 'Portion', 200],
  ['Naturjoghurt 3,5 %', 'Milchprodukte & Eier', 66, 3.9, 4.3, 3.5, 'Becher', 150],
  ['Griechischer Joghurt 10 %', 'Milchprodukte & Eier', 133, 4.4, 4.0, 10.0, 'Becher', 150],
  ['Skyr', 'Milchprodukte & Eier', 63, 11.0, 4.0, 0.2, 'Becher', 150],
  ['Milch 3,5 %', 'Milchprodukte & Eier', 64, 3.4, 4.8, 3.5, 'Glas', 200],
  ['Fettarme Milch 1,5 %', 'Milchprodukte & Eier', 47, 3.4, 4.9, 1.5, 'Glas', 200],
  ['Hafermilch', 'Milchprodukte & Eier', 46, 1.0, 6.7, 1.5, 'Glas', 200],
  ['Mandelmilch', 'Milchprodukte & Eier', 24, 0.5, 3.0, 1.1, 'Glas', 200],
  ['Gouda', 'Milchprodukte & Eier', 356, 24.9, 0.1, 28.5, 'Scheibe', 30],
  ['Mozzarella', 'Milchprodukte & Eier', 240, 18.0, 1.0, 18.0, 'Kugel', 125],
  ['Feta', 'Milchprodukte & Eier', 264, 14.2, 4.1, 21.3, 'Portion', 50],
  ['Hüttenkäse', 'Milchprodukte & Eier', 98, 12.4, 2.7, 4.4, 'Portion', 150],
  ['Frischkäse', 'Milchprodukte & Eier', 250, 6.0, 4.0, 23.0, 'EL', 15],
  ['Butter', 'Milchprodukte & Eier', 741, 0.7, 0.7, 82.0, 'TL', 5],
  ['Ei (M)', 'Milchprodukte & Eier', 143, 12.6, 0.7, 9.5, 'Stück', 60],
  ['Rührei', 'Milchprodukte & Eier', 154, 10.5, 1.5, 11.5, 'Portion', 150],
  ['Gekochtes Ei', 'Milchprodukte & Eier', 155, 12.6, 1.1, 10.6, 'Stück', 60],
  ['Buttermilch', 'Milchprodukte & Eier', 40, 3.4, 4.0, 1.0, 'Glas', 250, 0],
  ['Kefir', 'Milchprodukte & Eier', 55, 3.3, 4.0, 2.5, 'Glas', 200, 0],
  ['Joghurt 1,5 %', 'Milchprodukte & Eier', 48, 4.5, 5.0, 1.5, 'Becher', 150, 0],
  ['Sojajoghurt', 'Milchprodukte & Eier', 60, 4.0, 6.0, 2.5, 'Becher', 150, 1.0],
  ['Parmesan', 'Milchprodukte & Eier', 431, 38.0, 4.0, 29.0, 'EL', 10, 0],
  ['Cheddar', 'Milchprodukte & Eier', 402, 25.0, 1.3, 33.0, 'Scheibe', 30, 0],
  ['Schmand', 'Milchprodukte & Eier', 240, 3.0, 4.0, 24.0, 'EL', 15, 0],

  ['Hähnchenbrust', 'Fleisch & Fisch', 165, 31.0, 0.0, 3.6, 'Portion', 150],
  ['Putenbrust', 'Fleisch & Fisch', 135, 30.0, 0.0, 1.5, 'Portion', 150],
  ['Rinderhackfleisch', 'Fleisch & Fisch', 250, 26.0, 0.0, 17.0, 'Portion', 150],
  ['Schweineschnitzel', 'Fleisch & Fisch', 172, 25.0, 1.0, 8.0, 'Stück', 150],
  ['Lachs', 'Fleisch & Fisch', 208, 20.0, 0.0, 13.0, 'Portion', 150],
  ['Thunfisch (Dose, Wasser)', 'Fleisch & Fisch', 116, 26.0, 0.0, 1.0, 'Dose', 140],
  ['Garnelen', 'Fleisch & Fisch', 99, 24.0, 0.2, 0.3, 'Portion', 150],
  ['Salami', 'Fleisch & Fisch', 407, 22.0, 1.0, 36.0, 'Scheibe', 10],
  ['Kochschinken', 'Fleisch & Fisch', 145, 21.0, 0.5, 6.0, 'Scheibe', 20],
  ['Hackfleischsauce', 'Fleisch & Fisch', 130, 9.0, 5.0, 8.0, 'Portion', 150],
  ['Hähnchenschenkel', 'Fleisch & Fisch', 209, 26.0, 0.0, 11.0, 'Stück', 120, 0],
  ['Putenhackfleisch', 'Fleisch & Fisch', 170, 20.0, 0.0, 9.0, 'Portion', 150, 0],
  ['Rindersteak', 'Fleisch & Fisch', 271, 26.0, 0.0, 19.0, 'Stück', 200, 0],
  ['Schweinefilet', 'Fleisch & Fisch', 143, 21.0, 0.0, 6.0, 'Portion', 150, 0],
  ['Forelle', 'Fleisch & Fisch', 148, 20.8, 0.0, 6.6, 'Portion', 150, 0],
  ['Kabeljau', 'Fleisch & Fisch', 82, 18.0, 0.0, 0.7, 'Portion', 150, 0],

  ['Tofu', 'Pflanzliches Protein', 144, 17.0, 1.2, 8.7, 'Portion', 150],
  ['Räuchertofu', 'Pflanzliches Protein', 172, 19.0, 2.5, 9.5, 'Portion', 100],
  ['Tempeh', 'Pflanzliches Protein', 192, 20.0, 7.6, 11.0, 'Portion', 100],
  ['Linsen, gekocht', 'Pflanzliches Protein', 116, 9.0, 20.0, 0.4, 'Portion', 200],
  ['Kichererbsen, gekocht', 'Pflanzliches Protein', 164, 8.9, 27.4, 2.6, 'Portion', 150],
  ['Kidneybohnen, gekocht', 'Pflanzliches Protein', 127, 8.7, 22.8, 0.5, 'Portion', 150],
  ['Hummus', 'Pflanzliches Protein', 166, 7.9, 14.3, 9.6, 'EL', 25],
  ['Proteinpulver (Whey)', 'Pflanzliches Protein', 380, 78.0, 8.0, 5.0, 'Portion', 30],
  ['Erbsenprotein', 'Pflanzliches Protein', 375, 80.0, 3.0, 5.0, 'Portion', 30],
  ['Sojagranulat (trocken)', 'Pflanzliches Protein', 336, 50.0, 30.0, 1.5, 'Portion', 30, 18.0],
  ['Seitan', 'Pflanzliches Protein', 141, 25.0, 14.0, 2.0, 'Portion', 100, 1.0],
  ['Edamame', 'Pflanzliches Protein', 121, 11.9, 8.9, 5.2, 'Portion', 100, 5.0],
  ['Weiße Bohnen, gekocht', 'Pflanzliches Protein', 139, 9.7, 25.0, 0.5, 'Portion', 150, 6.3],

  ['Brokkoli', 'Gemüse', 34, 2.8, 6.6, 0.4, 'Portion', 200],
  ['Karotte', 'Gemüse', 41, 0.9, 9.6, 0.2, 'Stück', 80],
  ['Gurke', 'Gemüse', 15, 0.7, 3.6, 0.1, 'Portion', 150],
  ['Tomate', 'Gemüse', 18, 0.9, 3.9, 0.2, 'Stück', 120],
  ['Paprika', 'Gemüse', 31, 1.0, 6.0, 0.3, 'Stück', 150],
  ['Zucchini', 'Gemüse', 17, 1.2, 3.1, 0.3, 'Portion', 200],
  ['Blattsalat', 'Gemüse', 15, 1.4, 2.9, 0.2, 'Portion', 100],
  ['Spinat', 'Gemüse', 23, 2.9, 3.6, 0.4, 'Portion', 150],
  ['Champignons', 'Gemüse', 22, 3.1, 3.3, 0.3, 'Portion', 150],
  ['Zwiebel', 'Gemüse', 40, 1.1, 9.3, 0.1, 'Stück', 100],
  ['Erbsen (TK)', 'Gemüse', 81, 5.4, 14.5, 0.4, 'Portion', 150],
  ['Mais', 'Gemüse', 86, 3.3, 19.0, 1.4, 'Portion', 100],
  ['Avocado', 'Gemüse', 160, 2.0, 8.5, 14.7, 'halbe', 75],
  ['Gemischter Salat', 'Gemüse', 25, 1.2, 4.0, 0.4, 'Portion', 200],
  ['Blumenkohl', 'Gemüse', 25, 1.9, 5.0, 0.3, 'Portion', 200, 2.0],
  ['Rosenkohl', 'Gemüse', 43, 3.4, 9.0, 0.3, 'Portion', 150, 3.8],
  ['Rotkohl', 'Gemüse', 31, 1.4, 7.4, 0.2, 'Portion', 200, 2.1],
  ['Aubergine', 'Gemüse', 25, 1.0, 5.9, 0.2, 'Portion', 200, 3.0],
  ['Kürbis', 'Gemüse', 26, 1.0, 6.5, 0.1, 'Portion', 200, 0.5],
  ['Lauch', 'Gemüse', 61, 1.5, 14.0, 0.3, 'Stück', 150, 1.8],
  ['Rote Bete', 'Gemüse', 43, 1.6, 9.6, 0.2, 'Portion', 150, 2.8],
  ['Rucola', 'Gemüse', 25, 2.6, 3.7, 0.7, 'Portion', 50, 1.6],

  ['Banane', 'Obst', 89, 1.1, 22.8, 0.3, 'Stück', 120],
  ['Apfel', 'Obst', 52, 0.3, 13.8, 0.2, 'Stück', 180],
  ['Orange', 'Obst', 47, 0.9, 11.8, 0.1, 'Stück', 150],
  ['Erdbeeren', 'Obst', 32, 0.7, 7.7, 0.3, 'Portion', 150],
  ['Heidelbeeren', 'Obst', 57, 0.7, 14.5, 0.3, 'Portion', 125],
  ['Weintrauben', 'Obst', 69, 0.7, 18.1, 0.2, 'Portion', 150],
  ['Birne', 'Obst', 57, 0.4, 15.2, 0.1, 'Stück', 170],
  ['Kiwi', 'Obst', 61, 1.1, 14.7, 0.5, 'Stück', 75],
  ['Mango', 'Obst', 60, 0.8, 15.0, 0.4, 'Portion', 150],
  ['Wassermelone', 'Obst', 30, 0.6, 7.6, 0.2, 'Portion', 250],
  ['Tiefkühlbeeren', 'Obst', 45, 0.9, 9.0, 0.4, 'Portion', 100],
  ['Pfirsich', 'Obst', 39, 0.9, 9.5, 0.3, 'Stück', 150, 1.5],
  ['Nektarine', 'Obst', 44, 1.1, 10.6, 0.3, 'Stück', 150, 1.7],
  ['Ananas', 'Obst', 50, 0.5, 13.0, 0.1, 'Portion', 150, 1.4],
  ['Kirsche', 'Obst', 63, 1.1, 16.0, 0.2, 'Portion', 150, 2.1],
  ['Pflaume', 'Obst', 46, 0.7, 11.4, 0.3, 'Stück', 70, 1.4],
  ['Himbeeren', 'Obst', 52, 1.2, 11.9, 0.7, 'Portion', 125, 6.5],
  ['Johannisbeeren', 'Obst', 56, 1.4, 13.8, 0.2, 'Portion', 100, 4.3],
  ['Datteln', 'Obst', 282, 2.5, 75.0, 0.4, 'Stück', 8, 8.0],

  ['Mandeln', 'Nüsse & Öle', 579, 21.0, 22.0, 50.0, 'Handvoll', 25],
  ['Walnüsse', 'Nüsse & Öle', 654, 15.0, 14.0, 65.0, 'Handvoll', 25],
  ['Erdnüsse', 'Nüsse & Öle', 567, 26.0, 16.0, 49.0, 'Handvoll', 30],
  ['Erdnussbutter', 'Nüsse & Öle', 588, 25.0, 20.0, 50.0, 'EL', 15],
  ['Olivenöl', 'Nüsse & Öle', 884, 0.0, 0.0, 100.0, 'EL', 10],
  ['Rapsöl', 'Nüsse & Öle', 884, 0.0, 0.0, 100.0, 'EL', 10],
  ['Leinsamen', 'Nüsse & Öle', 534, 18.3, 28.9, 42.2, 'EL', 10],
  ['Chiasamen', 'Nüsse & Öle', 486, 16.5, 42.1, 30.7, 'EL', 12],
  ['Cashewkerne', 'Nüsse & Öle', 553, 18.0, 30.0, 44.0, 'Handvoll', 25, 3.3],
  ['Pistazien', 'Nüsse & Öle', 560, 20.0, 28.0, 45.0, 'Handvoll', 25, 10.0],
  ['Haselnüsse', 'Nüsse & Öle', 628, 15.0, 17.0, 61.0, 'Handvoll', 25, 10.0],
  ['Sonnenblumenkerne', 'Nüsse & Öle', 584, 21.0, 20.0, 51.0, 'EL', 10, 8.6],
  ['Kürbiskerne', 'Nüsse & Öle', 559, 30.0, 11.0, 49.0, 'EL', 10, 6.0],
  ['Mandelmus', 'Nüsse & Öle', 614, 21.0, 19.0, 56.0, 'EL', 15, 10.0],

  ['Honig', 'Süßes & Snacks', 304, 0.3, 82.0, 0.0, 'TL', 7],
  ['Zucker', 'Süßes & Snacks', 400, 0.0, 100.0, 0.0, 'TL', 5],
  ['Marmelade', 'Süßes & Snacks', 250, 0.4, 60.0, 0.1, 'EL', 20],
  ['Vollmilchschokolade', 'Süßes & Snacks', 535, 7.7, 59.0, 30.0, 'Riegel', 20],
  ['Zartbitterschokolade', 'Süßes & Snacks', 546, 4.9, 61.0, 31.0, 'Riegel', 20],
  ['Chips', 'Süßes & Snacks', 536, 7.0, 53.0, 34.0, 'Portion', 30],
  ['Gummibärchen', 'Süßes & Snacks', 343, 6.9, 77.0, 0.5, 'Portion', 30],
  ['Butterkeks', 'Süßes & Snacks', 480, 6.0, 65.0, 21.0, 'Stück', 12],
  ['Proteinriegel', 'Süßes & Snacks', 350, 30.0, 35.0, 10.0, 'Stück', 50],
  ['Eiscreme', 'Süßes & Snacks', 207, 3.5, 24.0, 11.0, 'Kugel', 60],
  ['Popcorn (luftgepoppt)', 'Süßes & Snacks', 387, 13.0, 78.0, 4.5, 'Portion', 20, 15.0],
  ['Salzstangen', 'Süßes & Snacks', 380, 10.0, 75.0, 3.0, 'Portion', 30, 3.0],
  ['Reiswaffeln', 'Süßes & Snacks', 387, 8.0, 81.0, 3.0, 'Stück', 8, 3.0],
  ['Müsliriegel', 'Süßes & Snacks', 400, 6.0, 65.0, 13.0, 'Stück', 25, 4.0],
  ['Nougat', 'Süßes & Snacks', 530, 8.0, 50.0, 33.0, 'Stück', 20, 2.0],
  ['Apfelkuchen', 'Süßes & Snacks', 250, 3.0, 35.0, 11.0, 'Stück', 100, 1.5],
  ['Donut', 'Süßes & Snacks', 421, 5.0, 51.0, 22.0, 'Stück', 60, 2.0],

  ['Wasser', 'Getränke', 0, 0.0, 0.0, 0.0, 'Glas', 250],
  ['Kaffee, schwarz', 'Getränke', 2, 0.1, 0.0, 0.0, 'Tasse', 200],
  ['Kaffee mit Milch', 'Getränke', 20, 1.0, 1.5, 1.0, 'Tasse', 200],
  ['Latte macchiato', 'Getränke', 55, 3.0, 5.0, 2.5, 'Glas', 300],
  ['Cappuccino', 'Getränke', 40, 2.5, 3.5, 1.8, 'Tasse', 200],
  ['Apfelsaft', 'Getränke', 46, 0.1, 11.3, 0.1, 'Glas', 200],
  ['Orangensaft', 'Getränke', 45, 0.7, 10.4, 0.2, 'Glas', 200],
  ['Cola', 'Getränke', 42, 0.0, 10.6, 0.0, 'Dose', 330],
  ['Cola Zero', 'Getränke', 0, 0.0, 0.0, 0.0, 'Dose', 330],
  ['Bier (Pils)', 'Getränke', 43, 0.5, 3.2, 0.0, 'Flasche', 500],
  ['Weißwein', 'Getränke', 82, 0.1, 2.6, 0.0, 'Glas', 200],
  ['Smoothie', 'Getränke', 60, 0.6, 13.0, 0.2, 'Glas', 250],
  ['Energydrink', 'Getränke', 45, 0.0, 11.0, 0.0, 'Dose', 250],
  ['Grüner Tee', 'Getränke', 1, 0.0, 0.0, 0.0, 'Tasse', 200, 0],
  ['Espresso', 'Getränke', 2, 0.1, 0.0, 0.0, 'Tasse', 30, 0],
  ['Kakao (3,5 % Milch)', 'Getränke', 80, 3.5, 10.0, 3.0, 'Tasse', 200, 0.5],
  ['Apfelschorle', 'Getränke', 25, 0.1, 6.0, 0.1, 'Glas', 250, 0.1],
  ['Limonade', 'Getränke', 40, 0.0, 10.0, 0.0, 'Glas', 250, 0],
  ['Sekt', 'Getränke', 75, 0.1, 1.4, 0.0, 'Glas', 100, 0],
  ['Kokoswasser', 'Getränke', 19, 0.7, 3.7, 0.2, 'Glas', 250, 1.1],

  ['Pizza Margherita', 'Gerichte', 250, 10.0, 33.0, 8.0, 'Stück', 300],
  ['Döner Kebab', 'Gerichte', 215, 12.0, 18.0, 11.0, 'Portion', 400],
  ['Currywurst mit Pommes', 'Gerichte', 290, 9.0, 25.0, 17.0, 'Portion', 350],
  ['Cheeseburger', 'Gerichte', 263, 13.0, 27.0, 11.0, 'Stück', 110],
  ['Sushi (Maki)', 'Gerichte', 150, 6.0, 26.0, 2.0, 'Portion', 200],
  ['Wiener Schnitzel', 'Gerichte', 250, 22.0, 12.0, 13.0, 'Stück', 160],
  ['Lasagne', 'Gerichte', 135, 7.0, 14.0, 6.0, 'Portion', 350],
  ['Spaghetti Bolognese', 'Gerichte', 150, 7.0, 20.0, 4.5, 'Portion', 400],
  ['Gemüsesuppe', 'Gerichte', 35, 1.2, 5.0, 1.0, 'Portion', 300],
  ['Kartoffelsalat', 'Gerichte', 145, 2.0, 14.0, 9.0, 'Portion', 200],
  ['Nudelsalat', 'Gerichte', 180, 5.0, 21.0, 8.0, 'Portion', 200],
  ['Caesar Salad', 'Gerichte', 160, 7.0, 6.0, 12.0, 'Portion', 250],
  ['Falafel', 'Gerichte', 333, 13.0, 32.0, 18.0, 'Stück', 25],
  ['Ramen', 'Gerichte', 90, 4.5, 12.0, 2.5, 'Portion', 500],
  ['Omelett', 'Gerichte', 175, 11.0, 1.0, 14.0, 'Portion', 150],
  ['Chicken Curry mit Reis', 'Gerichte', 140, 7.0, 16.0, 5.0, 'Portion', 400],
  ['Buddha Bowl', 'Gerichte', 130, 4.5, 17.0, 4.0, 'Portion', 400],
  ['Pfannkuchen', 'Gerichte', 200, 6.0, 28.0, 7.0, 'Stück', 70],
  ['Waffel', 'Gerichte', 310, 7.0, 42.0, 13.0, 'Stück', 60],
  ['Kaiserschmarrn', 'Gerichte', 210, 5.0, 32.0, 7.0, 'Portion', 250],
  ['Müslischale mit Milch', 'Gerichte', 130, 4.0, 20.0, 4.0, 'Schale', 300],
  ['Bratwurst', 'Gerichte', 301, 13.0, 2.0, 27.0, 'Stück', 100, 0],
  ['Currywurst (ohne Pommes)', 'Gerichte', 250, 11.0, 10.0, 18.0, 'Portion', 150, 0.5],
  ['Käsespätzle', 'Gerichte', 200, 8.0, 22.0, 9.0, 'Portion', 300, 1.0],
  ['Maultaschen', 'Gerichte', 200, 10.0, 20.0, 9.0, 'Portion', 200, 1.0],
  ['Chili con Carne', 'Gerichte', 130, 9.0, 9.0, 6.0, 'Portion', 350, 2.5],
  ['Gemüsecurry', 'Gerichte', 90, 3.0, 10.0, 4.0, 'Portion', 300, 2.5],
  ['Kartoffelsuppe', 'Gerichte', 70, 2.0, 10.0, 2.5, 'Portion', 300, 1.2],
  ['Linsensuppe', 'Gerichte', 90, 5.0, 12.0, 2.5, 'Portion', 300, 3.5],
  ['Toast Hawaii', 'Gerichte', 190, 10.0, 18.0, 9.0, 'Stück', 200, 1.0],
  ['Flammkuchen', 'Gerichte', 230, 8.0, 25.0, 11.0, 'Stück', 250, 1.3],
  ['Porridge', 'Gerichte', 90, 3.5, 15.0, 1.5, 'Schale', 300, 1.5],
  ['Overnight Oats', 'Gerichte', 130, 5.0, 20.0, 4.0, 'Portion', 300, 2.5],
  ['Sandwich (Käse)', 'Gerichte', 230, 10.0, 25.0, 9.0, 'Stück', 150, 1.5],
  ['Gyros', 'Gerichte', 220, 20.0, 5.0, 13.0, 'Portion', 250, 0.5],
];

export const GROUP_EMOJI = {
  'Brot & Backwaren': '🍞',
  'Beilagen & Getreide': '🍚',
  'Milchprodukte & Eier': '🥛',
  'Fleisch & Fisch': '🍗',
  'Pflanzliches Protein': '🌱',
  'Gemüse': '🥦',
  'Obst': '🍎',
  'Nüsse & Öle': '🥜',
  'Süßes & Snacks': '🍫',
  'Getränke': '☕',
  'Gerichte': '🍽️',
};

export function emojiForGroup(group) {
  return GROUP_EMOJI[group] || '🍽️';
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const LOCAL_FOODS = SEED_RAW.map((row, i) => {
  const [name, group, kcal, protein, carbs, fat, pLabel, pGrams, fiber = 0] = row;
  return {
    id: 'local_' + i + '_' + slug(name),
    name,
    group,
    emoji: emojiForGroup(group),
    per100: { kcal, protein, carbs, fat, fiber },
    portion: pLabel ? { label: pLabel, grams: pGrams } : null,
    source: 'local',
    brand: '',
  };
});

/* ---------------- Suche (lokal) ---------------- */

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function score(food, needle, tokens) {
  const hay = norm(
    food.name + ' ' + enOf(food.name) + ' ' + (food.brand || '') + ' ' + enOf(food.group || '') + ' ' + (food.group || '')
  );
  if (!tokens.every((t) => hay.includes(t))) return -1;
  let s = 0;
  if (hay.startsWith(needle)) s += 100;
  else if ((' ' + hay).includes(' ' + needle)) s += 60;
  else s += 25;
  s += Math.max(0, 20 - hay.length / 4);
  if (food.source === 'local') s += 6;
  return s;
}

export function searchLocal(query, limit = 30) {
  const needle = norm(query);
  if (!needle) return [];
  const tokens = needle.split(' ').filter(Boolean);
  return LOCAL_FOODS
    .map((food) => ({ food, s: score(food, needle, tokens) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.food);
}

/* ---------------- Open Food Facts ---------------- */

const OFF_FIELDS = [
  'code', 'product_name', 'product_name_de', 'generic_name', 'brands',
  'nutriments', 'serving_size', 'serving_quantity', 'quantity', 'image_small_url',
].join(',');

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : Number.parseFloat(v) || 0);

export function mapOffProduct(p) {
  if (!p) return null;
  const name = (p.product_name_de || p.product_name || p.generic_name || '').trim();
  if (!name) return null;
  const n = p.nutriments || {};
  let kcal = num(n['energy-kcal_100g']);
  if (!kcal && n.energy_100g) kcal = num(n.energy_100g) / 4.184;
  if (!kcal && n['energy-kcal']) kcal = num(n['energy-kcal']);
  if (!kcal) return null;

  const servingGrams = num(p.serving_quantity) || null;
  return {
    id: 'off_' + (p.code || slug(name)),
    code: p.code || '',
    name,
    brand: (p.brands || '').split(',')[0].trim(),
    group: 'Open Food Facts',
    emoji: '🛒',
    per100: {
      kcal: Math.round(kcal * 10) / 10,
      protein: Math.round(num(n.proteins_100g) * 10) / 10,
      carbs: Math.round(num(n.carbohydrates_100g) * 10) / 10,
      fat: Math.round(num(n.fat_100g) * 10) / 10,
      fiber: Math.round((num(n.fiber_100g) || num(n['fiber_100g'])) * 10) / 10,
    },
    portion: servingGrams ? { label: p.serving_size || 'Portion', grams: Math.round(servingGrams) } : null,
    image: p.image_small_url || '',
    source: 'off',
  };
}

async function fetchJson(url, timeout = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchRemote(query, limit = 20) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const fields = encodeURIComponent(OFF_FIELDS);
  const encoded = encodeURIComponent(q);

  // Mehrere Endpunkte: die deutsche Suche ist für DE-Produkte am besten,
  // der CGI-Endpunkt ist der robusteste Fallback (CORS-freundlich).
  const urls = [
    `https://de.openfoodfacts.org/api/v2/search?search_terms=${encoded}&fields=${fields}&page_size=${limit}`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${limit}&fields=${fields}`,
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      const products = Array.isArray(data.products) ? data.products : [];
      const items = products.map(mapOffProduct).filter(Boolean);
      if (items.length) return items;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}

export async function lookupBarcode(code) {
  const clean = String(code || '').replace(/\D/g, '');
  if (clean.length < 6) throw new Error('Bitte einen gültigen Barcode eingeben.');

  const cached = readBarcodeCache()[clean];
  if (cached) return cached;

  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${OFF_FIELDS}`;
  const data = await fetchJson(url, 12000);
  if (data.status === 0 || !data.product) throw new Error('Produkt nicht gefunden. Bitte manuell eingeben.');
  const mapped = mapOffProduct(data.product);
  if (!mapped) throw new Error('Für dieses Produkt fehlen Nährwerte.');
  writeBarcodeCache(clean, mapped);
  return mapped;
}

/* ---------- Barcode-Cache (offline wiederverwendbar) ---------- */

const BARCODE_CACHE_KEY = 'kaloriq.barcode.v1';

function readBarcodeCache() {
  try {
    const raw = localStorage.getItem(BARCODE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeBarcodeCache(code, food) {
  try {
    const map = readBarcodeCache();
    map[code] = { ...food, cachedAt: Date.now() };
    const keys = Object.keys(map).sort((a, b) => (map[b].cachedAt || 0) - (map[a].cachedAt || 0));
    const next = {};
    for (const key of keys.slice(0, 80)) next[key] = map[key];
    localStorage.setItem(BARCODE_CACHE_KEY, JSON.stringify(next));
  } catch {
    /* Speicher voll oder nicht verfügbar – Suche funktioniert weiter. */
  }
}

/* ---------------- Eigene Lebensmittel ---------------- */

export function customFoodFromInput({ name, kcal, protein, carbs, fat, portionLabel, portionGrams }) {
  return {
    id: 'custom_' + Date.now().toString(36),
    name: String(name || '').trim(),
    brand: '',
    group: 'Eigene',
    emoji: '✏️',
    per100: {
      kcal: Number(kcal) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: 0,
    },
    portion: portionGrams ? { label: portionLabel || 'Portion', grams: Number(portionGrams) } : null,
    source: 'custom',
  };
}

export function foodEmoji(food) {
  return food?.emoji || emojiForGroup(food?.group) || '🍽️';
}
