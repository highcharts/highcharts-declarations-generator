import * as dts from './dts';
import * as utils from './utils';

export type HighsoftProducts = ('highcharts' | 'highmaps' | 'highstock');

export class OptionsGenerator extends Object {

    /* *
     *
     *  Constructor
     * 
     * */

    public constructor (
        product: HighsoftProducts
    ) {
        super();
        this._product = product;
    }

    /* *
     *
     *  Properties
     * 
     * */

    public get product(): HighsoftProducts {
        return this._product;
    }
    private _product: HighsoftProducts;

    /* *
     *
     *  Functions
     *
     * */

    public generate (
        json: utils.Dictionary<TreeEntry>,
        targetFilePath: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                delete json._meta;
                let productCL = utils.capitalize(this.product),
                    interfaceProperty = this.walk({
                    children: json,
                    doclet: {
                        defaultvalue: 'undefined',
                        description: 'The ' + productCL + ' options',
                        products: [ this.product ],
                        type: {
                            names: [ 'interface' ]
                        }
                    },
                    meta: {
                        name:  productCL + 'Options'
                    }
                });
                utils
                    .save(targetFilePath, (
                            interfaceProperty && interfaceProperty.toString() ||
                            '{}'
                    ))
                    .then(resolve);
            } catch (err) {
                reject(err);
            }
        });
    }

    private walk (node: TreeEntry): (dts.InterfaceProperty | null) {

        if (!node ||
            !node.doclet ||
            !node.doclet.description ||
            !node.doclet.type ||
            !node.doclet.type.names ||
            !node.meta ||
            !node.meta.name
        ) {
            return null;
        }

        let comment = node.doclet.description,
            name = node.meta.name,
            type = dts.TypeConverter.convert(node.doclet.type.names),
            children = [] as Array<dts.InterfaceProperty>;

        Object
            .keys(node.children)
            .forEach(key => {
                let interfaceProperty = this.walk(node.children[key]);
                if (interfaceProperty) {
                    children.push(interfaceProperty);
                }
            });

        return new dts.InterfaceProperty(comment, name, type, children);
    }

}

interface TreeDefaultByProduct {

    highcharts: string;

    highmaps: string;

    highstock: string;

}

interface TreeDoclet {

    defaultByProduct?: TreeDefaultByProduct;

    defaultvalue?: string;

    description?: string;

    products: Array<HighsoftProducts>

    sample?: TreeSample;

    samples?: Array<TreeSample>;

    since?: string;

    type: TreeType;

    undocumented?: boolean;

}

interface TreeEntry {

    children: utils.Dictionary<TreeEntry>;

    doclet: TreeDoclet;

    meta: TreeMeta;

}

interface TreeMeta {

    column?: number;

    filename?: string;

    fullname?: string;

    line?: number;

    lineEnd?: number;

    name?: string;

}

interface TreeRootMeta {

    branch: string;

    commit: string;

    date: Date;

    version: string;

}

interface TreeSample {

    name?: string;

    products: Array<any>;

    value: string;

}

interface TreeType {

    names: Array<string>

}
