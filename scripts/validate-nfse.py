import sys
from pathlib import Path
from lxml import etree
# The official package includes .NET-style ^/$ pattern anchors.
# XSD 1.0/libxml treats those as literals. Translate only boundary anchors
# in memory; preserve the downloaded schemas unchanged.
root = Path(__file__).resolve().parent.parent / 'database/nfse'
class LocalSchemas(etree.Resolver):
    def resolve(self, url, public_id, context):
        target = (root / Path(url).name).resolve()
        if target.parent != root.resolve() or target.suffix != '.xsd':
            raise ValueError('External schema forbidden')
        document = etree.parse(str(target), etree.XMLParser(resolve_entities=False, no_network=True))
        for pattern in document.findall('.//{http://www.w3.org/2001/XMLSchema}pattern'):
            value = pattern.get('value', '')
            if value.startswith('^') and value.endswith('$'):
                pattern.set('value', value[1:-1])
        return self.resolve_string(etree.tostring(document), context, base_url=str(target))
try:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)
    parser.resolvers.add(LocalSchemas())
    data = sys.stdin.buffer.read(2 * 1024 * 1024)
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('DTD forbidden')
    schema = etree.XMLSchema(etree.parse(str(root / 'DPS_v1.01.xsd'), parser))
    schema.assertValid(etree.fromstring(data, etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)))
    print('OK')
except Exception:
    print('XML fora do leiaute oficial da DPS. Revise os campos fiscais e o cadastro do cliente.')
    sys.exit(1)
