/*******************************************************************************
 * Copyright  2015 rzorzorzo@users.sf.net
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/

package org.rzo.yajsw.app;

import java.io.IOException;
import java.lang.module.Configuration;
import java.lang.module.ModuleDescriptor;
import java.lang.module.ModuleFinder;
import java.lang.module.ModuleReference;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.nqzero.permit.Permit;


public class WrapperJVMMain9 extends AbstractWrapperJVMMain {
	public static void main(String[] args) throws IOException, ClassNotFoundException, NoSuchMethodException, SecurityException, IllegalAccessException, IllegalArgumentException, InvocationTargetException {

		preExecute(args);

		executeMain();

		postExecute();

	}

	protected static void executeMain() throws ClassNotFoundException, NoSuchMethodException, SecurityException, IllegalAccessException, IllegalArgumentException, InvocationTargetException {
		if (WRAPPER_MANAGER.getModule() == null)
			WrapperJVMMain.executeMain();
		// Create a module layer
		ModuleLayer layer = getModuleLayer();
		Optional<Module> om = layer.findModule(WRAPPER_MANAGER.getModule());
		if (!om.isPresent()) {
			System.out.println("module not found: " + WRAPPER_MANAGER.getModule());
			System.exit(999);
		}
		Module m = om.get();
		String mainClassName = WRAPPER_MANAGER.getMainClassName();
		if (mainClassName == null) {
			Optional<String> oc = om.get().getDescriptor().mainClass();
			if (!oc.isPresent()) {
				System.out.println("no main class for module: " + WRAPPER_MANAGER.getModule());
				System.exit(999);
			} else
				mainClassName = oc.get();
		}
		Class cls = m.getClassLoader().loadClass(mainClassName);

		Method mainMethod = cls.getMethod("main", new Class[] { String[].class });
		Permit.setAccessible(mainMethod);
		Object[] args = WRAPPER_MANAGER.getMainMethodArgs();
		mainMethod.invoke(null, new Object[] { args });

	}

	private static ModuleLayer getModuleLayer() {
		// Search for plugins in the plugins directory
		List<String> mpath = WRAPPER_MANAGER.getModulePath();
		Path[] paths = new Path[mpath.size()];
		for (int i=0; i<mpath.size(); i++)
		{
			paths[i] = Path.of(mpath.get(i));
			if (!paths[i].toFile().exists())
				System.out.println("WARNING: module path does not exist: "+paths[i]);			
		}
		ModuleFinder finder = ModuleFinder.of(paths);

		// Find all names of all found plugin modules
		List<String> modules = finder
		        .findAll()
		        .stream()
		        .map(ModuleReference::descriptor)
		        .map(ModuleDescriptor::name)
		        .collect(Collectors.toList());
		
		// Create configuration that will resolve plugin modules
		// (verify that the graph of modules is correct)
		Configuration pluginsConfiguration = ModuleLayer
		        .boot()
		        .configuration()
		        .resolve(finder, ModuleFinder.of(), modules);

		// Create a module layer for plugins
		ModuleLayer layer = ModuleLayer
		        .boot()
		        .defineModulesWithOneLoader(pluginsConfiguration, ClassLoader.getSystemClassLoader());
		
		return layer;
	}

}
