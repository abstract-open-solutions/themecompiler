Uso del theme compiler
======================

Si deve avere installato:

 * Python 2.7
 * o Python 2.6 con ``ordereddict`` e ``argparse``

A cosa serve
------------

A fare sì che i designer possano riutilizzare pezzi di markup HTML
quando sviluppano i temi statici, utilizzando una direttiva ``@@include``,
ad esempio scrivendo dentro il file ``@@include "pippo.html"``.

Quando avviene una "compilazione" in contenuto di ``pippo.html``
va a finire al posto della ``@@include "pippo.html"``.

Come si usa
-----------

I designer principalmente lo usano per vedere su un browser
i template che scrivono, effettuando la compilazione al volo.

Si fa con::

    $ python ../bin/theme.py serve

Questo lancia un webserver sulla porta 8000 che può essere ucciso con Ctrl+C.

Si può anche fare una compilazione statica,
ovvero fare compilare tutti i template e poi fare terminare il processo.
La buildout di sviluppo ad esempio lancia questo comando ogni volta.

Lo si fa con::

    $ python ../bin/theme.py compile

Se si vogliono compilare anche i file LESS_ nei corrispettivi file CSS,
basta fare::

    $ python ../bin/theme.py compile --compile-less --nodejs-bin=/path/to/node

Dove ``/path/to/node`` è il path completo al binario di `node.js`_
(sostanzialmente l'interprete del compilatore LESS_)

Ulteriori referenze
===================

Vedi ``THEMING.rst`` per informazioni generali e ``COMPILE.rst``
per informazioni specifiche sul theme compiler.


.. _`node.js`: http://nodejs.org
.. _LESS: http://lesscss.org
